import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Security service for handling device security checks and secure storage
class SecurityService {
  static const _storage = FlutterSecureStorage();
  
  // Keys for secure storage
  static const String _keyAuthToken = 'auth_token';
  static const String _keyUserId = 'user_id';
  
  /// Check if the device is rooted/jailbroken
  /// Returns true if device appears to be compromised
  Future<bool> isDeviceCompromised() async {
    try {
      // This is a placeholder - in production, use flutter_jailbreak_detection
      // 
      // import 'package:flutter_jailbreak_detection/flutter_jailbreak_detection.dart';
      // 
      // final bool jailbroken = await FlutterJailbreakDetection.jailbroken;
      // final bool developerMode = await FlutterJailbreakDetection.developerMode;
      // 
      // return jailbroken || developerMode;
      
      return false; // Placeholder
    } catch (e) {
      debugPrint('Error checking device security: $e');
      return false;
    }
  }
  
  /// Store authentication token securely
  Future<void> storeAuthToken(String token) async {
    await _storage.write(key: _keyAuthToken, value: token);
  }
  
  /// Retrieve authentication token
  Future<String?> getAuthToken() async {
    return await _storage.read(key: _keyAuthToken);
  }
  
  /// Clear authentication token
  Future<void> clearAuthToken() async {
    await _storage.delete(key: _keyAuthToken);
  }
  
  /// Store user ID securely
  Future<void> storeUserId(String userId) async {
    await _storage.write(key: _keyUserId, value: userId);
  }
  
  /// Retrieve user ID
  Future<String?> getUserId() async {
    return await _storage.read(key: _keyUserId);
  }
  
  /// Clear all secure storage
  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
  
  /// Validate the app environment before allowing sensitive operations
  Future<SecurityCheckResult> performSecurityCheck() async {
    final isCompromised = await isDeviceCompromised();
    
    if (isCompromised) {
      return SecurityCheckResult(
        passed: false,
        reason: 'Device appears to be rooted/jailbroken. '
                'For security reasons, this app cannot run on modified devices.',
      );
    }
    
    return SecurityCheckResult(passed: true);
  }
}

/// Result of a security check
class SecurityCheckResult {
  final bool passed;
  final String? reason;
  
  SecurityCheckResult({
    required this.passed,
    this.reason,
  });
}

/// HTTP Client with SSL Pinning
/// 
/// This is a conceptual example. In production, use:
/// - http_certificate_pinning package
/// - or dio with certificate pinning
/// 
/// Example with dio:
/// ```dart
/// import 'package:dio/dio.dart';
/// import 'package:dio/adapter.dart';
/// 
/// class SecureHttpClient {
///   static Dio createClient() {
///     final dio = Dio();
///     
///     (dio.httpClientAdapter as DefaultHttpClientAdapter).onHttpClientCreate = 
///       (client) {
///         client.badCertificateCallback = 
///           (X509Certificate cert, String host, int port) {
///             // Implement your certificate pinning logic here
///             // Compare cert.sha256 with your known certificate hash
///             return cert.sha256 == YOUR_EXPECTED_CERT_HASH;
///           };
///         return client;
///       };
///     
///     return dio;
///   }
/// }
/// ```

/// Certificate pinning configuration
class CertificatePinningConfig {
  /// Expected SHA-256 fingerprints of your server certificates
  /// Get these from your server's SSL certificate
  static const List<String> allowedCertificates = [
    // Add your certificate SHA-256 fingerprints here
    // Example: 'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
  ];
  
  /// Production API URL — replace with your actual domain before release.
  /// Also populate [allowedCertificates] with your server's SHA-256 fingerprints.
  static const String productionUrl = 'https://grade-guardian.onrender.com';

  /// Development API URL — set to Render so debug builds also reach the backend.
  /// Switch back to 'http://localhost:8000' if you run the server locally.
  static const String developmentUrl = 'https://grade-guardian.onrender.com';
  
  /// Get the appropriate URL based on build mode
  static String get apiUrl {
    return kReleaseMode ? productionUrl : developmentUrl;
  }
}