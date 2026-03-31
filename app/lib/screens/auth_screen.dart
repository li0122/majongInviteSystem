import 'package:flutter/material.dart';

import '../models/user_session.dart';
import '../services/auth_service.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({
    super.key,
    required this.authService,
    required this.fcmToken,
    required this.onVerified,
    required this.onNavigateToLogin,
  });

  final AuthService authService;
  final String fcmToken;
  final ValueChanged<UserSession> onVerified;
  final VoidCallback onNavigateToLogin;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _nameController = TextEditingController();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _emailController = TextEditingController();
  final _otpController = TextEditingController();

  bool _otpRequested = false;
  bool _loading = false;
  String? _message;

  @override
  void dispose() {
    _nameController.dispose();
    _usernameController.dispose();
    _passwordController.dispose();
    _emailController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    final name = _nameController.text.trim();
    final username = _usernameController.text.trim();
    final password = _passwordController.text.trim();
    final email = _emailController.text.trim();

    if (name.isEmpty || username.isEmpty || password.isEmpty || email.isEmpty) {
      setState(() => _message = '請填寫所有欄位');
      return;
    }

    if (password.length < 6) {
      setState(() => _message = '密碼至少需要 6 個字符');
      return;
    }

    setState(() {
      _loading = true;
      _message = null;
    });

    try {
      await widget.authService.register(
        name: name,
        username: username,
        password: password,
        email: email,
      );
      setState(() {
        _otpRequested = true;
        _message = 'OTP 已發送，請檢查信箱';
      });
    } catch (error) {
      setState(() => _message = '註冊失敗：${error.toString()}');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _verifyOtp() async {
    final email = _emailController.text.trim();
    final otp = _otpController.text.trim();

    if (email.isEmpty || otp.isEmpty) {
      setState(() => _message = '請輸入 OTP');
      return;
    }

    setState(() {
      _loading = true;
      _message = null;
    });

    try {
      final session = await widget.authService.verifyOtp(
        email: email,
        otp: otp,
        fcmToken: widget.fcmToken,
      );
      widget.onVerified(session);
    } catch (error) {
      setState(() => _message = '驗證失敗：${error.toString()}');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFF7F3E8), Color(0xFFE8F1F8)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 40),
                  Text(
                    '麻將邀約系統',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    '建立新帳號',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 16, color: Colors.grey),
                  ),
                  const SizedBox(height: 40),
                  if (!_otpRequested) ...[
                    TextField(
                      controller: _nameController,
                      decoration: InputDecoration(
                        labelText: '名稱',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        prefixIcon: const Icon(Icons.person),
                      ),
                      enabled: !_loading,
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _usernameController,
                      decoration: InputDecoration(
                        labelText: '帳號',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        prefixIcon: const Icon(Icons.account_circle),
                      ),
                      enabled: !_loading,
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _passwordController,
                      obscureText: true,
                      decoration: InputDecoration(
                        labelText: '密碼',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        prefixIcon: const Icon(Icons.lock),
                      ),
                      enabled: !_loading,
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _emailController,
                      decoration: InputDecoration(
                        labelText: 'Email',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        prefixIcon: const Icon(Icons.email),
                      ),
                      enabled: !_loading,
                    ),
                  ] else ...[
                    TextField(
                      controller: _otpController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: 'OTP 驗證碼',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        prefixIcon: const Icon(Icons.verified_user),
                      ),
                      enabled: !_loading,
                    ),
                  ],
                  const SizedBox(height: 24),
                  if (_message != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _message!.startsWith('OTP')
                            ? Colors.green.shade100
                            : Colors.red.shade100,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        _message!,
                        style: TextStyle(
                          color: _message!.startsWith('OTP')
                              ? Colors.green.shade700
                              : Colors.red.shade700,
                        ),
                      ),
                    ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loading ? null : (_otpRequested ? _verifyOtp : _register),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      backgroundColor: Colors.blue,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _loading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : Text(
                            _otpRequested ? '驗證並註冊' : '發送 OTP',
                            style: const TextStyle(color: Colors.white, fontSize: 16),
                          ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text('已有帳號？'),
                      TextButton(
                        onPressed: _loading ? null : widget.onNavigateToLogin,
                        child: const Text('登入', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                if (_message != null)
                  Text(
                    _message!,
                    style: const TextStyle(color: Color(0xFF8A1C1C)),
                  ),
                if (_loading)
                  const Padding(
                    padding: EdgeInsets.only(top: 12),
                    child: Center(child: CircularProgressIndicator()),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
