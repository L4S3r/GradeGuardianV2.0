import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/professor.dart';
import '../services/api_service.dart';

enum AuthState { unknown, unauthenticated, authenticated }

class AuthProvider extends ChangeNotifier {
  static const _storage    = FlutterSecureStorage();
  static const _tokenKey   = 'jwt_token';
  static const _profKey    = 'professor_json';

  final ApiService _api;

  AuthState  _state     = AuthState.unknown;
  Professor? _professor;
  String?    _token;
  String?    _error;

  AuthProvider(this._api) {
    _restoreSession();
  }

  AuthState  get authState  => _state;
  Professor? get professor  => _professor;
  String?    get token      => _token;
  String?    get error      => _error;
  bool get isAuthenticated  => _state == AuthState.authenticated;

  // ── Restore from secure storage on cold-start ──────────────────────────
  Future<void> _restoreSession() async {
    try {
      final token = await _storage.read(key: _tokenKey);
      final profJson = await _storage.read(key: _profKey);
      if (token != null && profJson != null) {
        _token     = token;
        _professor = Professor.fromJson(jsonDecode(profJson));
        _state     = AuthState.authenticated;
      } else {
        _state = AuthState.unauthenticated;
      }
    } catch (_) {
      _state = AuthState.unauthenticated;
    }
    notifyListeners();
  }

  // ── Register ───────────────────────────────────────────────────────────
  Future<bool> register({
    required String name,
    required String employeeId,
    required String department,
    required String email,
    required String password,
  }) async {
    _error = null;
    notifyListeners();
    try {
      final result = await _api.register(
        name:       name,
        employeeId: employeeId,
        department: department,
        email:      email,
        password:   password,
      );
      await _saveSession(result['access_token'], result['professor']);
      return true;
    } catch (e) {
      _error = _friendlyError(e.toString());
      notifyListeners();
      return false;
    }
  }

  // ── Login ──────────────────────────────────────────────────────────────
  Future<bool> login({required String email, required String password}) async {
    _error = null;
    notifyListeners();
    try {
      final result = await _api.login(email: email, password: password);
      await _saveSession(result['access_token'], result['professor']);
      return true;
    } catch (e) {
      _error = _friendlyError(e.toString());
      notifyListeners();
      return false;
    }
  }

  // ── Logout ─────────────────────────────────────────────────────────────
  Future<void> logout() async {
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _profKey);
    _token     = null;
    _professor = null;
    _state     = AuthState.unauthenticated;
    notifyListeners();
  }

  // ── Internal helpers ───────────────────────────────────────────────────
  Future<void> _saveSession(String token, Map<String, dynamic> profJson) async {
    _token     = token;
    _professor = Professor.fromJson(profJson);
    _state     = AuthState.authenticated;
    await _storage.write(key: _tokenKey,  value: token);
    await _storage.write(key: _profKey,   value: jsonEncode(profJson));
    notifyListeners();
  }

  String _friendlyError(String raw) {
    if (raw.contains('Email already')) return 'That email is already registered.';
    if (raw.contains('Employee ID'))  return 'That employee ID is already in use.';
    if (raw.contains('Invalid email') || raw.contains('401')) return 'Incorrect email or password.';
    if (raw.contains('SocketException') || raw.contains('Connection')) return 'Cannot reach server — check your connection.';
    return 'Something went wrong. Please try again.';
  }
}
