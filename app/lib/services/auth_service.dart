import '../models/user_session.dart';
import 'api_client.dart';

class AuthService {
  AuthService(this._apiClient);

  final ApiClient _apiClient;

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

    final user = result['user'] as Map<String, dynamic>;

    return UserSession(
      userId: user['id'].toString(),
      email: user['email'].toString(),
      fcmToken: fcmToken,
    );
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
