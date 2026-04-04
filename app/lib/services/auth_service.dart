import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/user_session.dart';
import 'api_client.dart';

class AuthService {
  AuthService(this._apiClient);

  final ApiClient _apiClient;
  static const String _tokenKey = 'auth_token';
  static const String _userKey = 'user_data';
  static const String _activeGroupKey = 'active_group_id';

  Future<String?> getStoredToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  Future<UserSession?> getStoredSession() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_userKey);

    if (raw == null || raw.isEmpty) {
      return null;
    }

    try {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      return UserSession(
        userId: map['userId'] as String,
        email: map['email'] as String,
        username: map['username'] as String,
        name: map['name'] as String,
        fcmToken: map['fcmToken'] as String,
        token: map['token'] as String,
      );
    } catch (_) {
      await prefs.remove(_userKey);
      await prefs.remove(_tokenKey);
      return null;
    }
  }

  Future<void> saveSession(UserSession session) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, session.token);
    await prefs.setString(
      _userKey,
      jsonEncode({
        'userId': session.userId,
        'email': session.email,
        'username': session.username,
        'name': session.name,
        'fcmToken': session.fcmToken,
        'token': session.token,
      }),
    );
  }

  Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
    await prefs.remove(_activeGroupKey);
  }

  Future<String?> getActiveGroupId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_activeGroupKey);
  }

  Future<void> setActiveGroupId(String groupId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_activeGroupKey, groupId);
  }

  Future<void> clearActiveGroupId() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_activeGroupKey);
  }

  Future<void> register({
    required String name,
    required String username,
    required String password,
    required String email,
  }) async {
    await _apiClient.post('/auth/register', {
      'name': name,
      'username': username,
      'password': password,
      'email': email,
    });
  }

  Future<void> requestOtp(String email) async {
    await _apiClient.post('/auth/request-otp', {'email': email});
  }

  Future<UserSession> verifyOtp({
    required String email,
    required String otp,
    required String fcmToken,
  }) async {
    final result = await _apiClient.post('/auth/verify-otp', {
      'email': email,
      'otp': otp,
      'fcmToken': fcmToken,
    });

    final token = result['token'].toString();
    final user = result['user'] as Map<String, dynamic>;

    final session = UserSession(
      userId: user['id'].toString(),
      email: user['email'].toString(),
      username: user['username'].toString(),
      name: user['name'].toString(),
      fcmToken: fcmToken,
      token: token,
    );

    await saveSession(session);
    return session;
  }

  Future<UserSession> login({
    required String username,
    required String password,
    required String fcmToken,
  }) async {
    final result = await _apiClient.post('/auth/login', {
      'username': username,
      'password': password,
      'fcmToken': fcmToken,
    });

    final token = result['token'].toString();
    final user = result['user'] as Map<String, dynamic>;

    final session = UserSession(
      userId: user['id'].toString(),
      email: user['email'].toString(),
      username: user['username'].toString(),
      name: user['name'].toString(),
      fcmToken: fcmToken,
      token: token,
    );

    await saveSession(session);
    return session;
  }

  Future<void> updateLocation({
    required String userId,
    required double lat,
    required double lon,
  }) async {
    await _apiClient.post('/auth/location', {
      'userId': userId,
      'lat': lat,
      'lon': lon,
    });
  }
}
