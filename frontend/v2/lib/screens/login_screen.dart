import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme/app_theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  int _selectedForm = 0; // 0 = Sign In, 1 = Register

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 40),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Logo / Header ──────────────────────────────────────────
              Center(
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppTheme.primary, AppTheme.primaryDark],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: AppTheme.radiusLg,
                    boxShadow: AppTheme.elevatedShadow,
                  ),
                  child: const Icon(Icons.security, color: Colors.white, size: 48),
                ),
              ),
              const SizedBox(height: 24),
              const Center(
                child: Text('GradeGuardian', style: AppTheme.headlineLarge),
              ),
              const SizedBox(height: 6),
              const Center(
                child: Text(
                  'Secure grade management for professors',
                  style: AppTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 36),

              // ── Buttons ────────────────────────────────────────────────
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => setState(() => _selectedForm = 0),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _selectedForm == 0 ? AppTheme.primary : Colors.white,
                        foregroundColor: _selectedForm == 0 ? Colors.white : AppTheme.textSecondary,
                        side: BorderSide(
                          color: _selectedForm == 0 ? AppTheme.primary : AppTheme.cardBorder,
                        ),
                      ),
                      child: const Text('Sign In'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => setState(() => _selectedForm = 1),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _selectedForm == 1 ? AppTheme.primary : Colors.white,
                        foregroundColor: _selectedForm == 1 ? Colors.white : AppTheme.textSecondary,
                        side: BorderSide(
                          color: _selectedForm == 1 ? AppTheme.primary : AppTheme.cardBorder,
                        ),
                      ),
                      child: const Text('Register'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 28),

              // ── Forms ──────────────────────────────────────────────────
              SizedBox(
                height: 440,
                child: _selectedForm == 0
                    ? const _LoginForm()
                    : const _RegisterForm(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Login Form
// ─────────────────────────────────────────────────────────────────────────────
class _LoginForm extends StatefulWidget {
  const _LoginForm();
  @override
  State<_LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<_LoginForm> {
  final _formKey   = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl  = TextEditingController();
  bool _loading    = false;
  bool _obscure    = true;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    final auth = context.read<AuthProvider>();
    final ok   = await auth.login(email: _emailCtrl.text.trim(), password: _passCtrl.text);
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(auth.error ?? 'Login failed'), backgroundColor: AppTheme.danger),
      );
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            controller:   _emailCtrl,
            keyboardType: TextInputType.emailAddress,
            decoration:   const InputDecoration(
              labelText:  'Email address',
              prefixIcon: Icon(Icons.email_outlined),
            ),
            validator: (v) => (v == null || !v.contains('@')) ? 'Enter a valid email' : null,
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller:     _passCtrl,
            obscureText:    _obscure,
            decoration: InputDecoration(
              labelText:   'Password',
              prefixIcon:  const Icon(Icons.lock_outline),
              suffixIcon: IconButton(
                icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                onPressed: () => setState(() => _obscure = !_obscure),
              ),
            ),
            validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
          ),
          const SizedBox(height: 28),
          ElevatedButton(
            onPressed: _loading ? null : _submit,
            child: _loading
                ? const SizedBox(
                    height: 20, width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Text('Sign In'),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Register Form
// ─────────────────────────────────────────────────────────────────────────────
class _RegisterForm extends StatefulWidget {
  const _RegisterForm();
  @override
  State<_RegisterForm> createState() => _RegisterFormState();
}

class _RegisterFormState extends State<_RegisterForm> {
  final _formKey    = GlobalKey<FormState>();
  final _nameCtrl   = TextEditingController();
  final _empIdCtrl  = TextEditingController();
  final _deptCtrl   = TextEditingController();
  final _emailCtrl  = TextEditingController();
  final _passCtrl   = TextEditingController();
  bool _loading     = false;
  bool _obscure     = true;

  @override
  void dispose() {
    _nameCtrl.dispose(); _empIdCtrl.dispose(); _deptCtrl.dispose();
    _emailCtrl.dispose(); _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    final auth = context.read<AuthProvider>();
    final ok   = await auth.register(
      name:       _nameCtrl.text.trim(),
      employeeId: _empIdCtrl.text.trim(),
      department: _deptCtrl.text.trim(),
      email:      _emailCtrl.text.trim(),
      password:   _passCtrl.text,
    );
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(auth.error ?? 'Registration failed'), backgroundColor: AppTheme.danger),
      );
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextFormField(
              controller:  _nameCtrl,
              decoration:  const InputDecoration(labelText: 'Full name', prefixIcon: Icon(Icons.person_outline)),
              validator:   (v) => (v == null || v.isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller:  _empIdCtrl,
              decoration:  const InputDecoration(labelText: 'Employee ID  (e.g. EMP-2024-047)', prefixIcon: Icon(Icons.badge_outlined)),
              validator:   (v) => (v == null || v.isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller:  _deptCtrl,
              decoration:  const InputDecoration(labelText: 'Department', prefixIcon: Icon(Icons.apartment_rounded)),
              validator:   (v) => (v == null || v.isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller:   _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              decoration:   const InputDecoration(labelText: 'Email address', prefixIcon: Icon(Icons.email_outlined)),
              validator:    (v) => (v == null || !v.contains('@')) ? 'Enter a valid email' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller:  _passCtrl,
              obscureText: _obscure,
              decoration:  InputDecoration(
                labelText:  'Password (min 6 chars)',
                prefixIcon: const Icon(Icons.lock_outline),
                suffixIcon: IconButton(
                  icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                  onPressed: () => setState(() => _obscure = !_obscure),
                ),
              ),
              validator: (v) => (v == null || v.length < 6) ? 'Minimum 6 characters' : null,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _loading ? null : _submit,
              child: _loading
                  ? const SizedBox(
                      height: 20, width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Create Account'),
            ),
          ],
        ),
      ),
    );
  }
}