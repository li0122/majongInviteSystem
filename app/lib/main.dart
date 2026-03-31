import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';

import 'models/user_session.dart';
import 'screens/auth_screen.dart';
import 'screens/login_screen.dart';
import 'screens/match_screen.dart';
import 'services/api_client.dart';
import 'services/auth_service.dart';
import 'services/location_service.dart';
import 'services/matchmaking_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  var firebaseReady = false;

  try {
    await Firebase.initializeApp();
    firebaseReady = true;
  } catch (_) {
    // Firebase options are project-specific; allow app to run without crashing in local setup.
  }

  var token = 'local-dev-token';

  if (firebaseReady) {
    try {
      await FirebaseMessaging.instance.requestPermission(alert: true, badge: true, sound: true);
      token = await FirebaseMessaging.instance.getToken() ?? token;
    } catch (_) {
      // Keep app usable on simulator even when APNs/FCM is unavailable.
    }
  }

  runApp(MahjongApp(fcmToken: token));
}

class MahjongApp extends StatefulWidget {
  const MahjongApp({super.key, required this.fcmToken});

  final String fcmToken;

  @override
  State<MahjongApp> createState() => _MahjongAppState();
}

class _MahjongAppState extends State<MahjongApp> {
  final _apiClient = ApiClient();
  UserSession? _session;
  bool _isLoading = true;
  bool _showLoginScreen = false;

  @override
  void initState() {
    super.initState();
    _checkAutoLogin();
  }

  Future<void> _checkAutoLogin() async {
    final authService = AuthService(_apiClient);
    final storedToken = await authService.getStoredToken();
    if (storedToken != null && mounted) {
      // Token 存在，暫時用它創建 session
      // 實際上應該用 token 去驗證後端，但這裡簡化處理
      setState(() {
        _isLoading = false;
        _showLoginScreen = true; // 還是要求重新登入確認
      });
    } else {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authService = AuthService(_apiClient);
    final matchmakingService = MatchmakingService(_apiClient);
    final locationService = LocationService();

    if (_isLoading) {
      return MaterialApp(
        home: Scaffold(
          body: Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFFF7F3E8), Color(0xFFE8F1F8)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: const Center(
              child: CircularProgressIndicator(),
            ),
          ),
        ),
      );
    }

    return MaterialApp(
      title: '麻將配對',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0F766E), brightness: Brightness.light),
        scaffoldBackgroundColor: const Color(0xFFF7F7F5),
        useMaterial3: true,
      ),
      home: _session == null
          ? (_showLoginScreen
              ? LoginScreen(
                  authService: authService,
                  fcmToken: widget.fcmToken,
                  onVerified: (session) => setState(() => _session = session),
                  onNavigateToRegister: () => setState(() => _showLoginScreen = false),
                )
              : AuthScreen(
                  authService: authService,
                  fcmToken: widget.fcmToken,
                  onVerified: (session) => setState(() => _session = session),
                  onNavigateToLogin: () => setState(() => _showLoginScreen = true),
                ))
          : MatchScreen(
              session: _session!,
              authService: authService,
              locationService: locationService,
              matchmakingService: matchmakingService,
            ),
    );
  }
}
