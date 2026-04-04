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

  Future<Map<String, dynamic>> getGroupOverview({required String userId, required String groupId}) {
    return _apiClient.get(
      '/matchmaking/group/$groupId/overview',
      queryParameters: {'userId': userId},
    );
  }

  Future<Map<String, dynamic>> getActiveGroup({required String userId}) {
    return _apiClient.get(
      '/matchmaking/group/active',
      queryParameters: {'userId': userId},
    );
  }

  Future<Map<String, dynamic>> getGroupMessages({required String userId, required String groupId}) {
    return _apiClient.get(
      '/matchmaking/group/$groupId/messages',
      queryParameters: {'userId': userId},
    );
  }

  Future<Map<String, dynamic>> postGroupMessage({
    required String userId,
    required String groupId,
    required String message,
  }) {
    return _apiClient.post('/matchmaking/group/$groupId/messages', {
      'userId': userId,
      'message': message,
    });
  }

  Future<Map<String, dynamic>> leaveGroup({required String userId, required String groupId}) {
    return _apiClient.post('/matchmaking/group/$groupId/leave', {
      'userId': userId,
    });
  }
}
