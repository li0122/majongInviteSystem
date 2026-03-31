class UserSession {
  const UserSession({
    required this.userId,
    required this.email,
    required this.username,
    required this.name,
    required this.fcmToken,
    required this.token,
  });

  final String userId;
  final String email;
  final String username;
  final String name;
  final String fcmToken;
  final String token;
}
