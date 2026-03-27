class UserSession {
  const UserSession({
    required this.userId,
    required this.email,
    required this.fcmToken,
  });

  final String userId;
  final String email;
  final String fcmToken;
}
