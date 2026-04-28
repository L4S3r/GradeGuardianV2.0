import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/grade_provider.dart';
import '../providers/theme_provider.dart';
import '../theme/app_theme.dart';

class ProfessorProfileScreen extends StatelessWidget {
  final String name;
  final String employeeId;
  final String department;

  const ProfessorProfileScreen({
    Key? key,
    required this.name,
    required this.employeeId,
    required this.department,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<GradeProvider>(
      builder: (context, provider, _) {
        final courseMap = <String, String>{};
        for (final g in provider.grades) {
          courseMap[g.courseCode] = g.courseName;
        }

        final tampered = provider.tamperedGrades.length;
        final verified = provider.verifiedGrades.length;
        final total    = provider.grades.length;

        return Scaffold(
          appBar: AppBar(
            title: const Text('Professor Profile'),
            actions: [
              // Theme toggle
              Consumer<ThemeProvider>(
                builder: (context, tp, _) => IconButton(
                  tooltip: 'Toggle theme',
                  icon: Icon(_themeIcon(tp, context)),
                  onPressed: () => tp.toggle(context),
                ),
              ),
              // Tamper badge
              if (provider.unreadTamperCount > 0)
                Padding(
                  padding: const EdgeInsets.only(right: 4),
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      const Icon(Icons.notifications_outlined),
                      Positioned(
                        top: 8, right: 0,
                        child: Container(
                          width: 16, height: 16,
                          decoration: const BoxDecoration(
                            color: AppTheme.danger, shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: Text(
                              '${provider.unreadTamperCount}',
                              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              // Logout
              IconButton(
                tooltip: 'Sign out',
                icon: const Icon(Icons.logout_rounded),
                onPressed: () => _confirmLogout(context),
              ),
            ],
          ),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _IdentityCard(name: name, employeeId: employeeId, department: department),
              const SizedBox(height: 16),
              _IntegrityBanner(tampered: tampered, verified: verified, total: total),
              const SizedBox(height: 16),
              _StatsRow(provider: provider, courseCount: courseMap.length),
              const SizedBox(height: 16),
              _CoursesCard(courseMap: courseMap, provider: provider),
              const SizedBox(height: 16),
              if (tampered > 0) ...[
                _TamperWarningCard(provider: provider),
                const SizedBox(height: 16),
              ],
              _ActionsCard(provider: provider),
              const SizedBox(height: 16),
              _ThemeCard(),
              const SizedBox(height: 24),
            ],
          ),
        );
      },
    );
  }

  IconData _themeIcon(ThemeProvider tp, BuildContext context) {
    if (tp.isSystem) return Icons.brightness_auto;
    return tp.isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded;
  }

  void _confirmLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign out?'),
        content: const Text('You will need to log in again to access your grade records.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.danger),
            onPressed: () {
              Navigator.pop(ctx);
              context.read<AuthProvider>().logout();
            },
            child: const Text('Sign out'),
          ),
        ],
      ),
    );
  }
}

// ── Identity card ─────────────────────────────────────────────────────────────
class _IdentityCard extends StatelessWidget {
  final String name, employeeId, department;
  const _IdentityCard({required this.name, required this.employeeId, required this.department});

  @override
  Widget build(BuildContext context) {
    final email = context.watch<AuthProvider>().professor?.email ?? '';
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppTheme.primary, AppTheme.primaryDark],
          begin: Alignment.topLeft, end: Alignment.bottomRight,
        ),
        borderRadius: AppTheme.radiusLg,
        boxShadow: AppTheme.elevatedShadow,
      ),
      child: Row(
        children: [
          Container(
            width: 72, height: 72,
            decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), shape: BoxShape.circle),
            child: const Icon(Icons.school_rounded, color: Colors.white, size: 38),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                _Row(Icons.badge_outlined, employeeId),
                const SizedBox(height: 3),
                _Row(Icons.apartment_rounded, department),
                const SizedBox(height: 3),
                _Row(Icons.email_outlined, email),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _Row(IconData icon, String text) => Row(
    children: [
      Icon(icon, color: Colors.white70, size: 13),
      const SizedBox(width: 4),
      Flexible(child: Text(text, style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w500), overflow: TextOverflow.ellipsis)),
    ],
  );
}

// ── Integrity banner ───────────────────────────────────────────────────────────
class _IntegrityBanner extends StatelessWidget {
  final int tampered, verified, total;
  const _IntegrityBanner({required this.tampered, required this.verified, required this.total});

  @override
  Widget build(BuildContext context) {
    final isClean = tampered == 0;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color:        isClean ? AppTheme.successLight  : AppTheme.dangerLight,
        borderRadius: AppTheme.radiusLg,
        border:       Border.all(color: isClean ? AppTheme.successBorder : AppTheme.dangerBorder, width: 1.5),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: (isClean ? AppTheme.success : AppTheme.danger).withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(isClean ? Icons.verified_user : Icons.report_problem,
                color: isClean ? AppTheme.success : AppTheme.danger, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isClean ? 'Integrity OK' : 'Integrity Alert',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700,
                      color: isClean ? AppTheme.success : AppTheme.danger),
                ),
                const SizedBox(height: 2),
                Text(
                  isClean ? 'All $total records verified' : '$tampered of $total record(s) flagged',
                  style: AppTheme.bodyMedium,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Stats row ──────────────────────────────────────────────────────────────────
class _StatsRow extends StatelessWidget {
  final GradeProvider provider;
  final int courseCount;
  const _StatsRow({required this.provider, required this.courseCount});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _Tile('Courses\nManaged', courseCount.toString(), AppTheme.primary, Icons.menu_book_rounded),
        const SizedBox(width: 10),
        _Tile('Grades\nRecorded', provider.grades.length.toString(), AppTheme.success, Icons.assignment_turned_in_rounded),
        const SizedBox(width: 10),
        _Tile('Avg\nScore', provider.averageGrade.toStringAsFixed(1), AppTheme.warning, Icons.analytics_rounded),
        const SizedBox(width: 10),
        _Tile(
          'Tampered\nRecords', provider.tamperedGrades.length.toString(),
          provider.hasTamperedGrades ? AppTheme.danger : AppTheme.success,
          provider.hasTamperedGrades ? Icons.warning_amber_rounded : Icons.shield_rounded,
        ),
      ],
    );
  }
}

class _Tile extends StatelessWidget {
  final String label, value;
  final Color color;
  final IconData icon;
  const _Tile(this.label, this.value, this.color, this.icon);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.07),
          borderRadius: AppTheme.radiusMd,
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 6),
            Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: color)),
            const SizedBox(height: 2),
            Text(label, style: AppTheme.labelSmall, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

// ── Courses managed ────────────────────────────────────────────────────────────
class _CoursesCard extends StatelessWidget {
  final Map<String, String> courseMap;
  final GradeProvider provider;
  const _CoursesCard({required this.courseMap, required this.provider});

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: 'Courses Managed', icon: Icons.menu_book_rounded,
      child: courseMap.isEmpty
          ? const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Text('No courses found', style: AppTheme.bodyMedium))
          : Column(
              children: courseMap.entries.map((entry) {
                final courseGrades = provider.grades.where((g) => g.courseCode == entry.key).toList();
                final tampered     = courseGrades.where((g) => !g.isVerified).length;
                final avg          = courseGrades.isEmpty ? 0.0
                    : courseGrades.map((g) => g.grade).reduce((a, b) => a + b) / courseGrades.length;

                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: tampered > 0 ? AppTheme.dangerLight : Theme.of(context).scaffoldBackgroundColor,
                    borderRadius: AppTheme.radiusMd,
                    border: Border.all(color: tampered > 0 ? AppTheme.dangerBorder : Theme.of(context).dividerColor),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: AppTheme.primary.withOpacity(0.1), borderRadius: AppTheme.radiusSm),
                        child: Text(entry.key, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.primary)),
                      ),
                      const SizedBox(width: 10),
                      Expanded(child: Text(entry.value, style: AppTheme.titleMedium, overflow: TextOverflow.ellipsis)),
                      const SizedBox(width: 8),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text('Avg ${avg.toStringAsFixed(1)}',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.gradeColor(avg))),
                          if (tampered > 0)
                            Text('$tampered tampered',
                                style: const TextStyle(fontSize: 10, color: AppTheme.danger, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
    );
  }
}

// ── Tamper warning ─────────────────────────────────────────────────────────────
class _TamperWarningCard extends StatelessWidget {
  final GradeProvider provider;
  const _TamperWarningCard({required this.provider});

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: 'Compromised Records', icon: Icons.warning_amber_rounded, iconColor: AppTheme.danger,
      child: Column(
        children: [
          ...provider.tamperedGrades.map((g) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 3),
            child: Row(
              children: [
                const Icon(Icons.circle, size: 6, color: AppTheme.danger),
                const SizedBox(width: 8),
                Expanded(child: Text('${g.courseCode} — ${g.courseName}', style: AppTheme.bodyMedium.copyWith(fontWeight: FontWeight.w600))),
                Text(g.grade.toStringAsFixed(1), style: const TextStyle(fontSize: 12, color: AppTheme.danger, fontWeight: FontWeight.w700)),
              ],
            ),
          )),
          const SizedBox(height: 8),
          const Text('These records may have been modified outside of GradeGuardian.',
              style: TextStyle(fontSize: 12, color: AppTheme.danger, fontStyle: FontStyle.italic)),
        ],
      ),
    );
  }
}

// ── Actions ────────────────────────────────────────────────────────────────────
class _ActionsCard extends StatelessWidget {
  final GradeProvider provider;
  const _ActionsCard({required this.provider});

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: 'Actions', icon: Icons.tune_rounded,
      child: Column(
        children: [
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: provider.isVerifying ? null : provider.verifyAllGrades,
              icon: provider.isVerifying
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.verified_user_outlined),
              label: Text(provider.isVerifying ? 'Verifying…' : 'Re-verify All Records'),
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: provider.unreadTamperCount == 0 ? null : provider.clearTamperBadge,
              icon: const Icon(Icons.notifications_off_outlined),
              label: Text(provider.unreadTamperCount == 0 ? 'No Alerts' : 'Clear ${provider.unreadTamperCount} Alert(s)'),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Theme card ─────────────────────────────────────────────────────────────────
class _ThemeCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeProvider>(
      builder: (context, tp, _) => _SectionCard(
        title: 'Appearance', icon: Icons.palette_outlined,
        child: Row(
          children: [
            _ThemeOption('Light',  Icons.light_mode_rounded,      tp.isLight,  () => tp.setMode(ThemeMode.light)),
            const SizedBox(width: 8),
            _ThemeOption('System', Icons.brightness_auto_rounded, tp.isSystem, () => tp.setMode(ThemeMode.system)),
            const SizedBox(width: 8),
            _ThemeOption('Dark',   Icons.dark_mode_rounded,       tp.isDark,   () => tp.setMode(ThemeMode.dark)),
          ],
        ),
      ),
    );
  }
}

class _ThemeOption extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;
  const _ThemeOption(this.label, this.icon, this.selected, this.onTap);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: selected ? AppTheme.primary : AppTheme.primary.withOpacity(0.07),
            borderRadius: AppTheme.radiusMd,
            border: Border.all(color: selected ? AppTheme.primary : AppTheme.primary.withOpacity(0.2)),
          ),
          child: Column(
            children: [
              Icon(icon, color: selected ? Colors.white : AppTheme.primary, size: 22),
              const SizedBox(height: 4),
              Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: selected ? Colors.white : AppTheme.primary)),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Shared section card ────────────────────────────────────────────────────────
class _SectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Widget child;
  final Color iconColor;

  const _SectionCard({required this.title, required this.icon, required this.child, this.iconColor = AppTheme.primary});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color,
        borderRadius: AppTheme.radiusLg,
        border: Border.all(color: Theme.of(context).dividerColor),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(icon, size: 18, color: iconColor),
            const SizedBox(width: 8),
            Text(title, style: AppTheme.titleMedium),
          ]),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}