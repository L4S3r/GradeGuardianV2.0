import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/material.dart';

/// Handles local push notifications for tamper detection alerts
class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  bool _initialized = false;

  /// Initialize the notification plugin — call once in main()
  Future<void> initialize() async {
    if (_initialized) return;

    const androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const settings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _plugin.initialize(settings);
    _initialized = true;
    debugPrint('NotificationService: initialized');
  }

  /// Request runtime permissions (Android 13+ / iOS)
  Future<void> requestPermissions() async {
    // Android
    final androidPlugin =
        _plugin.resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();
    await androidPlugin?.requestNotificationsPermission();

    // iOS
    final iosPlugin =
        _plugin.resolvePlatformSpecificImplementation<
            IOSFlutterLocalNotificationsPlugin>();
    await iosPlugin?.requestPermissions(alert: true, badge: true, sound: true);
  }

  // ── Notification channel ids ────────────────────────────────────────
  static const int _tamperChannelId = 1001;
  static const String _tamperChannelName = 'tamper_alerts';

  /// Show a tamper-detection push notification
  Future<void> showTamperAlert({
    required int tamperedCount,
    List<String> courseNames = const [],
  }) async {
    if (!_initialized) await initialize();

    final title = tamperedCount == 1
        ? '⚠️ Grade Record Tampered!'
        : '⚠️ $tamperedCount Grade Records Tampered!';

    final body = courseNames.isNotEmpty
        ? 'Affected: ${courseNames.take(3).join(', ')}${courseNames.length > 3 ? ' & more' : ''}'
        : 'Open the app to review the flagged records.';

    const androidDetails = AndroidNotificationDetails(
      _tamperChannelName,
      'Tamper Alerts',
      channelDescription: 'Alerts when a grade record fails integrity check',
      importance: Importance.high,
      priority: Priority.high,
      color: Color(0xFFDC2626),
      enableLights: true,
      ledColor: Color(0xFFDC2626),
      ledOnMs: 1000,
      ledOffMs: 500,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _plugin.show(_tamperChannelId, title, body, details);
    debugPrint('NotificationService: tamper alert sent ($tamperedCount records)');
  }

  /// Show a "all clear" notification after re-verification passes
  Future<void> showAllClearNotification() async {
    if (!_initialized) await initialize();

    const androidDetails = AndroidNotificationDetails(
      _tamperChannelName,
      'Tamper Alerts',
      channelDescription: 'Alerts when a grade record fails integrity check',
      importance: Importance.defaultImportance,
      priority: Priority.defaultPriority,
      color: Color(0xFF16A34A),
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: DarwinNotificationDetails(),
    );

    await _plugin.show(
      _tamperChannelId,
      '✅ All Records Verified',
      'All your grade records passed integrity checks.',
      details,
    );
  }

  /// Cancel all pending notifications
  Future<void> cancelAll() async => _plugin.cancelAll();
}