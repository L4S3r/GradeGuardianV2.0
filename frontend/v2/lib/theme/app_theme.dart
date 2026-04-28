import 'package:flutter/material.dart';

class AppTheme {
  // ── Brand Colors (shared) ────────────────────────────────────────────────
  static const Color primary     = Color(0xFF2563EB);
  static const Color primaryLight = Color(0xFFEFF6FF);
  static const Color primaryDark  = Color(0xFF1D4ED8);

  static const Color success      = Color(0xFF16A34A);
  static const Color successLight = Color(0xFFF0FDF4);
  static const Color successBorder = Color(0xFFBBF7D0);

  static const Color danger      = Color(0xFFDC2626);
  static const Color dangerLight = Color(0xFFFEF2F2);
  static const Color dangerBorder = Color(0xFFFECACA);

  static const Color warning      = Color(0xFFD97706);
  static const Color warningLight = Color(0xFFFFFBEB);

  // ── Light mode surfaces ──────────────────────────────────────────────────
  static const Color surface    = Color(0xFFFFFFFF);
  static const Color background = Color(0xFFF8FAFC);
  static const Color cardBorder = Color(0xFFE2E8F0);

  // ── Dark mode surfaces ───────────────────────────────────────────────────
  static const Color surfaceDark    = Color(0xFF1E2433);
  static const Color backgroundDark = Color(0xFF141926);
  static const Color cardBorderDark = Color(0xFF2D3548);

  // ── Text (light) ─────────────────────────────────────────────────────────
  static const Color textPrimary   = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color textHint      = Color(0xFF94A3B8);

  // ── Text (dark) ──────────────────────────────────────────────────────────
  static const Color textPrimaryDark   = Color(0xFFF1F5F9);
  static const Color textSecondaryDark = Color(0xFF94A3B8);
  static const Color textHintDark      = Color(0xFF64748B);

  // ── Grade colours ────────────────────────────────────────────────────────
  static Color gradeColor(double grade) {
    if (grade >= 90) return success;
    if (grade >= 80) return primary;
    if (grade >= 70) return warning;
    if (grade >= 60) return const Color(0xFFEA580C);
    return danger;
  }

  static Color gradeColorLight(double grade) {
    if (grade >= 90) return successLight;
    if (grade >= 80) return primaryLight;
    if (grade >= 70) return warningLight;
    if (grade >= 60) return const Color(0xFFFFF7ED);
    return dangerLight;
  }

  // ── Typography ───────────────────────────────────────────────────────────
  static const TextStyle headlineLarge = TextStyle(
    fontSize: 28, fontWeight: FontWeight.w800,
    color: textPrimary, letterSpacing: -0.5,
  );
  static const TextStyle headlineMedium = TextStyle(
    fontSize: 22, fontWeight: FontWeight.w700,
    color: textPrimary, letterSpacing: -0.3,
  );
  static const TextStyle titleLarge = TextStyle(
    fontSize: 18, fontWeight: FontWeight.w700, color: textPrimary,
  );
  static const TextStyle titleMedium = TextStyle(
    fontSize: 15, fontWeight: FontWeight.w600, color: textPrimary,
  );
  static const TextStyle bodyMedium = TextStyle(
    fontSize: 14, fontWeight: FontWeight.w400, color: textSecondary,
  );
  static const TextStyle labelSmall = TextStyle(
    fontSize: 11, fontWeight: FontWeight.w600,
    color: textSecondary, letterSpacing: 0.5,
  );

  // ── Shadows ──────────────────────────────────────────────────────────────
  static List<BoxShadow> get cardShadow => [
    BoxShadow(
      color: const Color(0xFF0F172A).withOpacity(0.06),
      blurRadius: 12, offset: const Offset(0, 4),
    ),
    BoxShadow(
      color: const Color(0xFF0F172A).withOpacity(0.04),
      blurRadius: 4, offset: const Offset(0, 1),
    ),
  ];

  static List<BoxShadow> get elevatedShadow => [
    BoxShadow(
      color: primary.withOpacity(0.18),
      blurRadius: 20, offset: const Offset(0, 8),
    ),
  ];

  // ── Border Radius ────────────────────────────────────────────────────────
  static const BorderRadius radiusSm   = BorderRadius.all(Radius.circular(8));
  static const BorderRadius radiusMd   = BorderRadius.all(Radius.circular(12));
  static const BorderRadius radiusLg   = BorderRadius.all(Radius.circular(16));
  static const BorderRadius radiusXl   = BorderRadius.all(Radius.circular(20));
  static const BorderRadius radiusFull = BorderRadius.all(Radius.circular(999));

  // ── Light Theme ──────────────────────────────────────────────────────────
  static ThemeData get lightTheme => ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: background,
    colorScheme: ColorScheme.fromSeed(
      seedColor: primary,
      brightness: Brightness.light,
      surface: surface,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: surface,
      foregroundColor: textPrimary,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        fontSize: 20, fontWeight: FontWeight.w800,
        color: textPrimary, letterSpacing: -0.3,
      ),
    ),
    cardTheme: const CardThemeData(
      color: surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: radiusLg,
        side: BorderSide(color: cardBorder),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: background,
      border: OutlineInputBorder(
          borderRadius: radiusMd,
          borderSide: const BorderSide(color: cardBorder)),
      enabledBorder: OutlineInputBorder(
          borderRadius: radiusMd,
          borderSide: const BorderSide(color: cardBorder)),
      focusedBorder: OutlineInputBorder(
          borderRadius: radiusMd,
          borderSide: const BorderSide(color: primary, width: 2)),
      labelStyle: bodyMedium,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        shape: const RoundedRectangleBorder(borderRadius: radiusMd),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: surface,
      selectedItemColor: primary,
      unselectedItemColor: textHint,
      type: BottomNavigationBarType.fixed,
      elevation: 0,
      selectedLabelStyle: TextStyle(fontWeight: FontWeight.w700, fontSize: 11),
      unselectedLabelStyle: TextStyle(fontWeight: FontWeight.w500, fontSize: 11),
    ),
  );

  // ── Dark Theme ───────────────────────────────────────────────────────────
  static ThemeData get darkTheme => ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: backgroundDark,
    colorScheme: ColorScheme.fromSeed(
      seedColor: primary,
      brightness: Brightness.dark,
      surface: surfaceDark,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: surfaceDark,
      foregroundColor: textPrimaryDark,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        fontSize: 20, fontWeight: FontWeight.w800,
        color: textPrimaryDark, letterSpacing: -0.3,
      ),
    ),
    cardTheme: const CardThemeData(
      color: surfaceDark,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: radiusLg,
        side: BorderSide(color: cardBorderDark),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: backgroundDark,
      border: OutlineInputBorder(
          borderRadius: radiusMd,
          borderSide: const BorderSide(color: cardBorderDark)),
      enabledBorder: OutlineInputBorder(
          borderRadius: radiusMd,
          borderSide: const BorderSide(color: cardBorderDark)),
      focusedBorder: OutlineInputBorder(
          borderRadius: radiusMd,
          borderSide: const BorderSide(color: primary, width: 2)),
      labelStyle: const TextStyle(color: textSecondaryDark, fontSize: 14),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        shape: const RoundedRectangleBorder(borderRadius: radiusMd),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: surfaceDark,
      selectedItemColor: primary,
      unselectedItemColor: textHintDark,
      type: BottomNavigationBarType.fixed,
      elevation: 0,
      selectedLabelStyle: TextStyle(fontWeight: FontWeight.w700, fontSize: 11),
      unselectedLabelStyle: TextStyle(fontWeight: FontWeight.w500, fontSize: 11),
    ),
    dialogTheme: const DialogThemeData(backgroundColor: surfaceDark),
    dividerColor: cardBorderDark,
  );
}