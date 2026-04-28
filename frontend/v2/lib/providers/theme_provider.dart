import 'package:flutter/material.dart';

/// Manages app-wide theme mode: system / light / dark.
/// Auto follows the system by default; user can override manually.
class ThemeProvider extends ChangeNotifier {
  ThemeMode _themeMode = ThemeMode.system;

  ThemeMode get themeMode => _themeMode;

  bool get isLight => _themeMode == ThemeMode.light;
  bool get isDark => _themeMode == ThemeMode.dark;
  bool get isSystem => _themeMode == ThemeMode.system;

  /// Toggle between light and dark (if currently following system,
  /// first switch uses the opposite of the system's current brightness).
  void toggle(BuildContext context) {
    final systemDark =
        MediaQuery.platformBrightnessOf(context) == Brightness.dark;

    if (_themeMode == ThemeMode.system) {
      // Switch away from system to the opposite of what system currently shows
      _themeMode = systemDark ? ThemeMode.light : ThemeMode.dark;
    } else if (_themeMode == ThemeMode.dark) {
      _themeMode = ThemeMode.light;
    } else {
      _themeMode = ThemeMode.dark;
    }
    notifyListeners();
  }

  /// Revert to following the system setting
  void useSystem() {
    _themeMode = ThemeMode.system;
    notifyListeners();
  }

  void setMode(ThemeMode mode) {
    _themeMode = mode;
    notifyListeners();
  }
}