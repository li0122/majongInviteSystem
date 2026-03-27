import 'package:flutter/material.dart';

import '../models/user_session.dart';
import '../services/auth_service.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({
    super.key,
    required this.authService,
    required this.fcmToken,
    required this.onVerified,
  });

  final AuthService authService;
  final String fcmToken;
  final ValueChanged<UserSession> onVerified;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _emailController = TextEditingController();
  final _otpController = TextEditingController();

  bool _otpRequested = false;
  bool _loading = false;
  String? _message;

  @override
  void dispose() {
    _emailController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _requestOtp() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      setState(() => _message = '請輸入 Email');
      return;
    }

    setState(() {
      _loading = true;
      _message = null;
    });

    try {
      await widget.authService.requestOtp(email);
      setState(() {
        _otpRequested = true;
        _message = 'OTP 已發送，請檢查信箱';
      });
    } catch (error) {
      setState(() => _message = error.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _verifyOtp() async {
    final email = _emailController.text.trim();
    final otp = _otpController.text.trim();

    if (email.isEmpty || otp.isEmpty) {
      setState(() => _message = '請輸入 Email 與 OTP');
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
      setState(() => _message = error.toString());
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
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 16),
                const Text(
                  '麻將配對',
                  style: TextStyle(fontSize: 34, fontWeight: FontWeight.w800, color: Color(0xFF1F2D3D)),
                ),
                const Text(
                  '即時桌友媒合平台',
                  style: TextStyle(fontSize: 16, color: Color(0xFF4B5D6B)),
                ),
                const SizedBox(height: 28),
                Card(
                  elevation: 0,
                  color: Colors.white.withValues(alpha: 0.85),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        TextField(
                          controller: _emailController,
                          decoration: const InputDecoration(
                            labelText: 'Email',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 12),
                        if (_otpRequested)
                          TextField(
                            controller: _otpController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'OTP 驗證碼',
                              border: OutlineInputBorder(),
                            ),
                          ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton(
                            onPressed: _loading ? null : (_otpRequested ? _verifyOtp : _requestOtp),
                            style: FilledButton.styleFrom(backgroundColor: const Color(0xFF0C6B58), foregroundColor: Colors.white),
                            child: Text(_otpRequested ? '驗證登入' : '發送 OTP'),
                          ),
                        ),
                      ],
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
