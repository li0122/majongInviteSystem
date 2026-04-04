import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

import '../models/user_session.dart';
import 'match_screen.dart';
import '../services/auth_service.dart';
import '../services/location_service.dart';
import '../services/matchmaking_service.dart';

class MatchedGroupScreen extends StatefulWidget {
  const MatchedGroupScreen({
    super.key,
    required this.groupId,
    required this.session,
    required this.authService,
    required this.locationService,
    required this.matchmakingService,
    this.onGroupEnded,
  });

  final String groupId;
  final UserSession session;
  final AuthService authService;
  final LocationService locationService;
  final MatchmakingService matchmakingService;
  final VoidCallback? onGroupEnded;

  @override
  State<MatchedGroupScreen> createState() => _MatchedGroupScreenState();
}

class _MatchedGroupScreenState extends State<MatchedGroupScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _chatScrollController = ScrollController();

  int _tabIndex = 0;
  bool _loadingOverview = true;
  bool _sendingMessage = false;
  bool _leavingGroup = false;
  String? _errorText;

  Map<String, dynamic>? _venue;
  List<Map<String, dynamic>> _members = [];
  List<Map<String, dynamic>> _messages = [];

  Timer? _pollingTimer;
  StreamSubscription<Position>? _positionSub;

  @override
  void initState() {
    super.initState();
    _initialize();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _chatScrollController.dispose();
    _pollingTimer?.cancel();
    _positionSub?.cancel();
    super.dispose();
  }

  Future<void> _initialize() async {
    await _refreshAll();

    final granted = await widget.locationService.requestPermissionAndService();
    if (granted) {
      _positionSub = widget.locationService.positionStream().listen((position) {
        widget.authService.updateLocation(
          userId: widget.session.userId,
          lat: position.latitude,
          lon: position.longitude,
        );
      });
    }

    _pollingTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      _refreshAll();
    });
  }

  Future<void> _refreshAll() async {
    await Future.wait([
      _refreshOverview(),
      _refreshMessages(),
    ]);
  }

  Future<void> _refreshOverview() async {
    try {
      final result = await widget.matchmakingService.getGroupOverview(
        userId: widget.session.userId,
        groupId: widget.groupId,
      );

      final status = result['status']?.toString();
      if (status == 'dissolved') {
        await _handleGroupDissolved();
        return;
      }

      final members = (result['members'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .toList();

      if (!mounted) {
        return;
      }

      setState(() {
        _venue = result['venue'] as Map<String, dynamic>?;
        _members = members;
        _loadingOverview = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loadingOverview = false;
        _errorText = '無法取得群組資訊：$error';
      });
    }
  }

  Future<void> _refreshMessages() async {
    try {
      final result = await widget.matchmakingService.getGroupMessages(
        userId: widget.session.userId,
        groupId: widget.groupId,
      );

      final status = result['status']?.toString();
      if (status == 'dissolved') {
        await _handleGroupDissolved();
        return;
      }

      final messages = (result['messages'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .toList();

      if (!mounted) {
        return;
      }

      setState(() {
        _messages = messages;
      });

      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_chatScrollController.hasClients) {
          _chatScrollController.jumpTo(_chatScrollController.position.maxScrollExtent);
        }
      });
    } catch (_) {
      // Keep UI usable when polling fails temporarily.
    }
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty || _sendingMessage) {
      return;
    }

    setState(() => _sendingMessage = true);

    try {
      final result = await widget.matchmakingService.postGroupMessage(
        userId: widget.session.userId,
        groupId: widget.groupId,
        message: text,
      );

      if (result['status']?.toString() == 'dissolved') {
        await _handleGroupDissolved();
        return;
      }

      _messageController.clear();
      await _refreshMessages();
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _errorText = '訊息送出失敗：$error');
    } finally {
      if (mounted) {
        setState(() => _sendingMessage = false);
      }
    }
  }

  Future<void> _handleGroupDissolved() async {
    _pollingTimer?.cancel();
    _positionSub?.cancel();
    await widget.authService.clearActiveGroupId();

    if (!mounted) {
      return;
    }

    widget.onGroupEnded?.call();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('有成員離開，房間已解散，已返回配對佇列')),
    );
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (_) => MatchScreen(
          session: widget.session,
          authService: widget.authService,
          locationService: widget.locationService,
          matchmakingService: widget.matchmakingService,
        ),
      ),
      (_) => false,
    );
  }

  Future<void> _confirmLeaveGroup() async {
    if (_leavingGroup) {
      return;
    }

    final confirmed = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('確認退出配對房間'),
            content: const Text('你退出後，整個房間會解散，所有成員都會重新加入配對佇列。'),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('取消'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('確定退出'),
              ),
            ],
          ),
        ) ??
        false;

    if (!confirmed) {
      return;
    }

    setState(() => _leavingGroup = true);
    try {
      await widget.matchmakingService.leaveGroup(
        userId: widget.session.userId,
        groupId: widget.groupId,
      );
      await _handleGroupDissolved();
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _errorText = '退出房間失敗：$error';
      });
    } finally {
      if (mounted) {
        setState(() => _leavingGroup = false);
      }
    }
  }

  double? _toDouble(dynamic value) {
    if (value is num) {
      return value.toDouble();
    }
    if (value is String) {
      return double.tryParse(value);
    }
    return null;
  }

  Widget _buildChatTab() {
    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            controller: _chatScrollController,
            padding: const EdgeInsets.all(12),
            itemCount: _messages.length,
            itemBuilder: (context, index) {
              final item = _messages[index];
              final senderId = item['senderId']?.toString() ?? '';
              final mine = senderId == widget.session.userId;
              final senderName = item['senderName']?.toString() ?? '未知使用者';
              final message = item['message']?.toString() ?? '';

              return Align(
                alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  margin: const EdgeInsets.symmetric(vertical: 4),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  constraints: const BoxConstraints(maxWidth: 280),
                  decoration: BoxDecoration(
                    color: mine ? const Color(0xFF0F766E) : Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFD1D5DB)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (!mine)
                        Text(
                          senderName,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF334155),
                          ),
                        ),
                      Text(
                        message,
                        style: TextStyle(
                          color: mine ? Colors.white : const Color(0xFF0F172A),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        Container(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
          decoration: const BoxDecoration(color: Color(0xFFF8FAFC)),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _messageController,
                  minLines: 1,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    hintText: '輸入訊息給桌友',
                    border: OutlineInputBorder(),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: _sendingMessage ? null : _sendMessage,
                style: FilledButton.styleFrom(backgroundColor: const Color(0xFF0F766E)),
                child: const Text('送出'),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildMapTab() {
    final venueLat = _toDouble(_venue?['lat']);
    final venueLon = _toDouble(_venue?['lon']);

    final memberMarkers = _members
        .where((m) => m['location'] != null)
        .map((member) {
          final location = member['location'] as Map<String, dynamic>;
          final lat = _toDouble(location['lat']);
          final lon = _toDouble(location['lon']);
          if (lat == null || lon == null) {
            return null;
          }

          final userId = member['userId']?.toString() ?? '';
          final mine = userId == widget.session.userId;
          final name = member['name']?.toString() ?? '玩家';

          return Marker(
            point: LatLng(lat, lon),
            width: 110,
            height: 56,
            child: Column(
              children: [
                Icon(
                  Icons.person_pin_circle,
                  color: mine ? const Color(0xFF0284C7) : const Color(0xFF334155),
                  size: 32,
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFCBD5E1)),
                  ),
                  child: Text(
                    mine ? '$name (我)' : name,
                    style: const TextStyle(fontSize: 11),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          );
        })
        .whereType<Marker>()
        .toList();

    final markers = <Marker>[...memberMarkers];

    if (venueLat != null && venueLon != null) {
      markers.add(
        Marker(
          point: LatLng(venueLat, venueLon),
          width: 120,
          height: 60,
          child: Column(
            children: [
              const Icon(Icons.storefront, color: Color(0xFFB45309), size: 30),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFBEB),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFF59E0B)),
                ),
                child: Text(
                  _venue?['name']?.toString() ?? '店家',
                  style: const TextStyle(fontSize: 11),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      );
    }

    final center = markers.isNotEmpty ? markers.first.point : const LatLng(23.691664, 120.524733);

    return Column(
      children: [
        Expanded(
          child: FlutterMap(
            options: MapOptions(
              initialCenter: center,
              initialZoom: 16,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.mahjong.invite.app',
              ),
              MarkerLayer(markers: markers),
            ],
          ),
        ),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          color: const Color(0xFFF8FAFC),
          child: Text(
            '即時位置每 5 秒更新一次。店家：${_venue?['name'] ?? '尚未提供'}',
            style: const TextStyle(color: Color(0xFF334155)),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      child: Scaffold(
        appBar: AppBar(
          automaticallyImplyLeading: false,
          title: const Text('已成團'),
          backgroundColor: const Color(0xFF163A5F),
          foregroundColor: Colors.white,
          actions: [
            TextButton.icon(
              onPressed: _leavingGroup ? null : _confirmLeaveGroup,
              icon: const Icon(Icons.exit_to_app, color: Colors.white),
              label: Text(
                _leavingGroup ? '退出中' : '退出配對',
                style: const TextStyle(color: Colors.white),
              ),
            ),
          ],
        ),
        body: _loadingOverview
            ? const Center(child: CircularProgressIndicator())
            : Column(
                children: [
                  if (_errorText != null)
                    MaterialBanner(
                      backgroundColor: const Color(0xFFFFF7ED),
                      content: Text(_errorText!),
                      actions: [
                        TextButton(
                          onPressed: () => setState(() => _errorText = null),
                          child: const Text('關閉'),
                        ),
                      ],
                    ),
                  Expanded(
                    child: _tabIndex == 0 ? _buildChatTab() : _buildMapTab(),
                  ),
                ],
              ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _tabIndex,
          onDestinationSelected: (index) => setState(() => _tabIndex = index),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.chat_bubble_outline),
              selectedIcon: Icon(Icons.chat_bubble),
              label: '聊天室',
            ),
            NavigationDestination(
              icon: Icon(Icons.map_outlined),
              selectedIcon: Icon(Icons.map),
              label: '地圖',
            ),
          ],
        ),
      ),
    );
  }
}
