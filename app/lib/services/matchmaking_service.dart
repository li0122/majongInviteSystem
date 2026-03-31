import 'api_client.dart';

class MatchmakingService {
  MatchmakingService(this._apiClient);

  final ApiClient _apiClient;

  Future<Map<String, dynamic>> startMatch({
    required String userId,
    required String stakeLevel,
    required DateTime startTime,
    required double lat,
    required double lon,
  }) {
    return _apiClient.post('/matchmaking/start', {
      'userId': userId,
      'stakeLevel': stakeLevel,
      'startTime': startTime.toIso8601String(),
      'lat': lat,
      'lon': lon,
    });
  }

  Future<Map<String, dynamic>> getMatchProgress({required String userId, required String requestId}) {
    return _apiClient.get(
      '/matchmaking/progress/$requestId',
      queryParameters: {'userId': userId},
    );
  }
}
