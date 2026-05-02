import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/api_service.dart';
import 'services/security_service.dart';
import 'services/notification_service.dart';
import 'providers/auth_provider.dart';
import 'providers/grade_provider.dart';
import 'providers/theme_provider.dart';
import 'screens/grades_screen.dart';
import 'screens/stats_screen.dart';
import 'screens/student_profile_screen.dart';
import 'screens/login_screen.dart';
import 'theme/app_theme.dart';
import 'widgets/shimmer_loaders.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await NotificationService().initialize();
  await NotificationService().requestPermissions();

  final securityService = SecurityService();
  final check = await securityService.performSecurityCheck();

  if (!check.passed) {
    runApp(SecurityBlockedApp(reason: check.reason!));
    return;
  }

  runApp(const GradeGuardianApp());
}

class GradeGuardianApp extends StatelessWidget {
  const GradeGuardianApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final apiService = ApiService(baseUrl: CertificatePinningConfig.apiUrl);

    return MultiProvider(
      providers: [
        Provider<ApiService>.value(value: apiService),
        Provider<SecurityService>(create: (_) => SecurityService()),
        // AuthProvider must come before GradeProvider
        ChangeNotifierProvider<AuthProvider>(
          create: (_) => AuthProvider(apiService),
        ),
        // GradeProvider rebuilds when AuthProvider changes via ProxyProvider
        ChangeNotifierProxyProvider<AuthProvider, GradeProvider>(
          create: (ctx) => GradeProvider(apiService),
          update: (ctx, auth, previous) {
            // Sync the JWT token into the shared ApiService
            apiService.authToken = auth.token;
            final provider = previous ?? GradeProvider(apiService);
            // If auth just logged out, wipe grades
            if (!auth.isAuthenticated) provider.clear();
            return provider;
          },
        ),
        ChangeNotifierProvider<ThemeProvider>(
          create: (_) => ThemeProvider(),
        ),
      ],
      child: Consumer<ThemeProvider>(
        builder: (context, themeProvider, _) {
          return MaterialApp(
            title: 'GradeGuardian',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.lightTheme,
            darkTheme: AppTheme.darkTheme,
            themeMode: themeProvider.themeMode,
            home: const _AuthGate(),
          );
        },
      ),
    );
  }
}

/// Watches AuthProvider and shows either the login screen or the app shell.
class _AuthGate extends StatelessWidget {
  const _AuthGate({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        switch (auth.authState) {
          case AuthState.unknown:
            // Splash / loading while we restore the session from secure storage
            return const Scaffold(
              body: Center(child: CircularShimmer(size: 48)),
            );
          case AuthState.unauthenticated:
            return const LoginScreen();
          case AuthState.authenticated:
            return const _AppShell();
        }
      },
    );
  }
}

class _AppShell extends StatefulWidget {
  const _AppShell({Key? key}) : super(key: key);

  @override
  State<_AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<_AppShell> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    // Load this professor's grades right after login
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<GradeProvider>().loadGrades();
    });
  }

  @override
  Widget build(BuildContext context) {
    final professor = context.watch<AuthProvider>().professor!;

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: [
          const GradesScreen(studentId: null),
          const StatsScreen(),
          ProfessorProfileScreen(
            name:        professor.name,
            employeeId:  professor.employeeId,
            department:  professor.department,
          ),
        ],
      ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).appBarTheme.backgroundColor,
        border: Border(top: BorderSide(color: Theme.of(context).dividerColor)),
      ),
      child: Consumer<GradeProvider>(
        builder: (context, provider, _) {
          return BottomNavigationBar(
            currentIndex: _currentIndex,
            onTap: (i) => setState(() => _currentIndex = i),
            backgroundColor: Theme.of(context).appBarTheme.backgroundColor,
            elevation: 0,
            selectedItemColor: AppTheme.primary,
            unselectedItemColor: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
            selectedLabelStyle:   const TextStyle(fontWeight: FontWeight.w700, fontSize: 11),
            unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 11),
            items: [
              const BottomNavigationBarItem(
                icon: Icon(Icons.list_alt_rounded),
                label: 'Grades',
              ),
              const BottomNavigationBarItem(
                icon: Icon(Icons.bar_chart_rounded),
                label: 'Statistics',
              ),
              BottomNavigationBarItem(
                icon: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    const Icon(Icons.person_outline_rounded),
                    if (provider.hasTamperedGrades)
                      Positioned(
                        top: -2, right: -2,
                        child: Container(
                          width: 8, height: 8,
                          decoration: const BoxDecoration(
                            color: AppTheme.danger, shape: BoxShape.circle,
                          ),
                        ),
                      ),
                  ],
                ),
                activeIcon: const Icon(Icons.person_rounded),
                label: 'Profile',
              ),
            ],
          );
        },
      ),
    );
  }
}

// ── Security blocked screen ──────────────────────────────────────────────────

class SecurityBlockedApp extends StatelessWidget {
  final String reason;
  const SecurityBlockedApp({Key? key, required this.reason}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      home: Scaffold(
        backgroundColor: AppTheme.dangerLight,
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: AppTheme.danger.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.security, size: 72, color: AppTheme.danger),
                  ),
                  const SizedBox(height: 28),
                  const Text('Security Check Failed', style: AppTheme.headlineMedium),
                  const SizedBox(height: 12),
                  Text(reason, style: AppTheme.bodyMedium, textAlign: TextAlign.center),
                  const SizedBox(height: 28),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.surface,
                      borderRadius: AppTheme.radiusMd,
                      border: Border.all(color: AppTheme.dangerBorder),
                    ),
                    child: const Column(
                      children: [
                        Icon(Icons.info_outline, size: 28, color: AppTheme.primary),
                        SizedBox(height: 8),
                        Text('Why is this happening?', style: AppTheme.titleMedium),
                        SizedBox(height: 8),
                        Text(
                          'GradeGuardian requires a secure, unmodified device '
                          'to protect the integrity of academic records.',
                          style: AppTheme.bodyMedium,
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
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