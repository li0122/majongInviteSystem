import 'dart:async';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';

import '../models/stake_levels.dart';
import '../models/user_session.dart';
import '../services/auth_service.dart';
import '../services/location_service.dart';
import '../services/matchmaking_service.dart';

class MatchScreen extends StatefulWidget {
  const MatchScreen({
    super.key,
    required this.session,
    required this.authService,
    required this.locationService,
    required this.matchmakingService,
  });

  final UserSession session;
  final AuthService authService;
  final LocationService locationService;
  final MatchmakingService matchmakingService;

  @override
  State<MatchScreen> createState() => _MatchScreenState();
}

class _MatchScreenState extends State<MatchScreen> {
  String _selectedStake = stakeLevels.first;
  DateTime _selectedTime = DateTime.now().add(const Duration(minutes: 30));
  bool _trackingReady = false;
  bool _loading = false;
  String _statusText = '等待開始配對';

  StreamSubscription<Position>? _positionSub;

  @override
  void initState() {
    super.initState();
    _setupLocationTracking();
  }

  @override
  void dispose() {
    _positionSub?.cancel();
    super.dispose();
  }

  Future<void> _setupLocationTracking() async {
    final granted = await widget.locationService.requestPermissionAndService();

    if (!mounted) {
      return;
    }

    if (!granted) {
      setState(() {
        _trackingReady = false;
        _statusText = '請開啟 GPS 權限，包含背景定位權限';
      });
      return;
    }

    _positionSub = widget.locationService.positionStream().listen((position) async {
      await widget.authService.updateLocation(
        userId: widget.session.userId,
        lat: position.latitude,
        lon: position.longitude,
      );
    });

    setState(() {
      _trackingReady = true;
      _statusText = '定位追蹤中，可開始配對';
    });
  }

  Future<void> _pickStartTime() async {
    final now = DateTime.now();
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_selectedTime),
    );

    if (time == null) {
      return;
    }

    final selected = DateTime(now.year, now.month, now.day, time.hour, time.minute);
    setState(() => _selectedTime = selected.isBefore(now) ? selected.add(const Duration(days: 1)) : selected);
  }

  Future<void> _startMatch() async {
    if (!_trackingReady) {
      setState(() => _statusText = '定位尚未準備完成');
      return;
    }

    setState(() {
      _loading = true;
      _statusText = '正在搜尋 15KM 內桌友...';
    });

    try {
      final pos = await widget.locationService.currentPosition();
      await widget.authService.updateLocation(
        userId: widget.session.userId,
        lat: pos.latitude,
        lon: pos.longitude,
      );

      final result = await widget.matchmakingService.startMatch(
        userId: widget.session.userId,
        stakeLevel: _selectedStake,
        startTime: _selectedTime,
        lat: pos.latitude,
        lon: pos.longitude,
      );

      if (!mounted) {
        return;
      }

      final status = result['status']?.toString() ?? 'unknown';
      if (status == 'waiting') {
        setState(() => _statusText = '已送出配對，等待更多玩家加入');
      } else {
        final venue = result['venue'] as Map<String, dynamic>;
        setState(() {
          _statusText = '成團成功：${venue['name']}\n導航：${venue['navigationUrl']}';
        });
      }
    } catch (error) {
      setState(() => _statusText = '配對失敗：$error');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final timeText = DateFormat('MM/dd HH:mm').format(_selectedTime);

    return Scaffold(
      appBar: AppBar(
        title: const Text('麻將配對'),
        backgroundColor: const Color(0xFF163A5F),
        foregroundColor: Colors.white,
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFF5EFE0), Color(0xFFE4ECF5)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              color: Colors.white.withValues(alpha: 0.9),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      '選擇金額等級',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final level in stakeLevels)
                          ChoiceChip(
                            label: Text(level),
                            selected: _selectedStake == level,
                            onSelected: (_) => setState(() => _selectedStake = level),
                          ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            '開始時間：$timeText',
                            style: const TextStyle(fontSize: 16),
                          ),
                        ),
                        OutlinedButton(
                          onPressed: _pickStartTime,
                          child: const Text('選擇時間'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _loading ? null : _startMatch,
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF0F766E),
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 52),
              ),
              child: Text(_loading ? '媒合中...' : '開始配對'),
            ),
            const SizedBox(height: 16),
            Card(
              color: const Color(0xFFFFFDF7),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Text(_statusText),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              '提醒：若要完整背景追蹤，請於 Android 前景服務與 iOS Background Modes 啟用 location。',
              style: TextStyle(color: Color(0xFF475569)),
            ),
          ],
        ),
      ),
    );
  }
}
