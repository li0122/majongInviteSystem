import 'package:shared_preferences/shared_preferences.dart';

import '../models/user_session.dart';
import 'api_client.dart';

class AuthService {
  AuthService(this._apiClient);

  final ApiClient _apiClient;
  static const String _tokenKey = 'auth_token';
  static const String _userKey = 'user_data';

  Future<String?> getStoredToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
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

    await saveToken(token);
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

    await saveToken(token);
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
