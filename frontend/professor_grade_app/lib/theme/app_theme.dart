import 'package:flutter/material.dart';

/// UI/UX Pro Max Theme System for GradeGuardian
class AppTheme {
  // ── Brand & Color Palettes (Cyber & Executive Academic) ──────────────────
  static const Color primary        = Color(0xFF0EA5E9); // Electric Cyan
  static const Color primaryLight   = Color(0xFFE0F2FE);
  static const Color primaryDark    = Color(0xFF0284C7);

  static const Color accent         = Color(0xFF6366F1); // Indigo Accent
  static const Color accentLight    = Color(0xFFEEF2FF);

  static const Color success        = Color(0xFF10B981); // Emerald Mint
  static const Color successLight   = Color(0xFFD1FAE5);
  static const Color successBorder  = Color(0xFFA7F3D0);

  static const Color danger         = Color(0xFFEF4444); // Crimson Red
  static const Color dangerLight    = Color(0xFFFEE2E2);
  static const Color dangerBorder   = Color(0xFFFCA5A5);

  static const Color warning        = Color(0xFFF59E0B); // Amber
  static const Color warningLight   = Color(0xFFFEF3C7);

  // ── Light Surfaces ───────────────────────────────────────────────────────
  static const Color surface        = Color(0xFFFFFFFF);
  static const Color background     = Color(0xFFF8FAFC);
  static const Color cardBorder     = Color(0xFFE2E8F0);

  // ── Dark Surfaces ────────────────────────────────────────────────────────
  static const Color surfaceDark    = Color(0xFF1E293B);
  static const Color backgroundDark = Color(0xFF0F172A);
  static const Color cardBorderDark = Color(0xFF334155);

  // ── Text (Light) ─────────────────────────────────────────────────────────
  static const Color textPrimary    = Color(0xFF0F172A);
  static const Color textSecondary  = Color(0xFF64748B);
  static const Color textHint       = Color(0xFF94A3B8);

  // ── Text (Dark) ──────────────────────────────────────────────────────────
  static const Color textPrimaryDark   = Color(0xFFF8FAFC);
  static const Color textSecondaryDark = Color(0xFFCBD5E1);
  static const Color textHintDark      = Color(0xFF64748B);

  // ── Grade Colors ─────────────────────────────────────────────────────────
  static Color gradeColor(double grade) {
    if (grade >= 90) return success;
    if (grade >= 80) return primary;
    if (grade >= 70) return warning;
    if (grade >= 60) return const Color(0xFFF97316);
    return danger;
  }

  static Color gradeColorLight(double grade) {
    if (grade >= 90) return successLight;
    if (grade >= 80) return primaryLight;
    if (grade >= 70) return warningLight;
    if (grade >= 60) return const Color(0xFFFFEDD5);
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
      color: const Color(0xFF0F172A).withOpacity(0.05),
      blurRadius: 16, offset: const Offset(0, 4),
    ),
    BoxShadow(
      color: const Color(0xFF0F172A).withOpacity(0.02),
      blurRadius: 4, offset: const Offset(0, 1),
    ),
  ];

  static List<BoxShadow> get elevatedShadow => [
    BoxShadow(
      color: primary.withOpacity(0.25),
      blurRadius: 20, offset: const Offset(0, 8),
    ),
  ];

  // ── Border Radius ────────────────────────────────────────────────────────
  static const BorderRadius radiusSm   = BorderRadius.all(Radius.circular(8));
  static const BorderRadius radiusMd   = BorderRadius.all(Radius.circular(14));
  static const BorderRadius radiusLg   = BorderRadius.all(Radius.circular(20));
  static const BorderRadius radiusFull = BorderRadius.all(Radius.circular(999));

  // ── Light Theme Configuration ────────────────────────────────────────────
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      primaryColor: primary,
      scaffoldBackgroundColor: background,
      colorScheme: const ColorScheme.light(
        primary: primary,
        secondary: accent,
        surface: surface,
        error: danger,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: surface,
        foregroundColor: textPrimary,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: textPrimary,
          fontSize: 19,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.3,
        ),
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: radiusLg,
          side: const BorderSide(color: cardBorder, width: 1),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFFF1F5F9),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: radiusMd,
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: radiusMd,
          borderSide: const BorderSide(color: cardBorder, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: radiusMd,
          borderSide: const BorderSide(color: primary, width: 2),
        ),
        labelStyle: const TextStyle(color: textSecondary, fontSize: 14),
        hintStyle: const TextStyle(color: textHint, fontSize: 14),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: const RoundedRectangleBorder(borderRadius: radiusMd),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
        ),
      ),
    );
  }

  // ── Dark Theme Configuration ─────────────────────────────────────────────
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: primary,
      scaffoldBackgroundColor: backgroundDark,
      colorScheme: const ColorScheme.dark(
        primary: primary,
        secondary: accent,
        surface: surfaceDark,
        error: danger,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: surfaceDark,
        foregroundColor: textPrimaryDark,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: textPrimaryDark,
          fontSize: 19,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.3,
        ),
      ),
      cardTheme: CardThemeData(
        color: surfaceDark,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: radiusLg,
          side: const BorderSide(color: cardBorderDark, width: 1),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF0F172A),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: radiusMd,
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: radiusMd,
          borderSide: const BorderSide(color: cardBorderDark, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: radiusMd,
          borderSide: const BorderSide(color: primary, width: 2),
        ),
        labelStyle: const TextStyle(color: textSecondaryDark, fontSize: 14),
        hintStyle: const TextStyle(color: textHintDark, fontSize: 14),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: const RoundedRectangleBorder(borderRadius: radiusMd),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
        ),
      ),
    );
  }
}