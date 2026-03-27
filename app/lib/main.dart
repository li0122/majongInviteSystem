import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';

import 'models/user_session.dart';
import 'screens/auth_screen.dart';
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

  @override
  Widget build(BuildContext context) {
    final authService = AuthService(_apiClient);
    final matchmakingService = MatchmakingService(_apiClient);
    final locationService = LocationService();

    return MaterialApp(
      title: '麻將配對',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0F766E), brightness: Brightness.light),
        scaffoldBackgroundColor: const Color(0xFFF7F7F5),
        useMaterial3: true,
      ),
      home: _session == null
          ? AuthScreen(
              authService: authService,
              fcmToken: widget.fcmToken,
              onVerified: (session) => setState(() => _session = session),
            )
          : MatchScreen(
              session: _session!,
              authService: authService,
              locationService: locationService,
              matchmakingService: matchmakingService,
            ),
    );
  }
}
