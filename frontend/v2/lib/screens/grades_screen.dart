import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../widgets/add_grade_dialog.dart';
import '../providers/grade_provider.dart';
import '../widgets/grade_card.dart';

class GradesScreen extends StatefulWidget {
  final String? studentId;

  const GradesScreen({Key? key, this.studentId}) : super(key: key);

  @override
  State<GradesScreen> createState() => _GradesScreenState();
}

class _GradesScreenState extends State<GradesScreen> {
  @override
  void initState() {
    super.initState();
    // Load grades when screen initializes
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<GradeProvider>().loadGrades(studentId: widget.studentId);
    });
  }

@override
Widget build(BuildContext context) {
  return Scaffold(
    appBar: AppBar(
      title: const Text('Grade Records'),
      elevation: 0,
      actions: [
        // Refresh button
        IconButton(
          icon: const Icon(Icons.refresh),
          onPressed: () {
            context.read<GradeProvider>().refresh(studentId: widget.studentId);
          },
        ),
      ],
    ),
    body: Consumer<GradeProvider>(
      builder: (context, gradeProvider, child) {
        // Global tamper alert banner
        return Column(
          children: [
            if (gradeProvider.hasTamperedGrades)
              _buildTamperAlertBanner(gradeProvider),
            
            Expanded(
              child: _buildBody(gradeProvider),
            ),
          ],
        );
      },
    ),
    floatingActionButton: FloatingActionButton.extended(
      onPressed: () {
        showDialog(
          context: context,
          builder: (context) => const AddGradeDialog(),
        );
      },
      label: const Text('Add Grade'),
      icon: const Icon(Icons.add_moderator), // Represents a "Secure" add
    ),
  ); 
}

  Widget _buildTamperAlertBanner(GradeProvider provider) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red.shade700,
        boxShadow: [
          BoxShadow(
            color: Colors.red.shade200,
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          const Icon(
            Icons.report_problem,
            color: Colors.white,
            size: 28,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'SECURITY ALERT',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${provider.tamperedGrades.length} record(s) have been tampered with',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: () {
              _showTamperedGradesDialog(context, provider);
            },
            style: TextButton.styleFrom(
              foregroundColor: Colors.white,
              backgroundColor: Colors.white.withOpacity(0.2),
            ),
            child: const Text('VIEW'),
          ),
        ],
      ),
    );
  }

  Widget _buildBody(GradeProvider provider) {
    if (provider.isLoading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Loading grades...'),
          ],
        ),
      );
    }

    if (provider.hasError) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.red.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              'Error loading grades',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Text(
                provider.errorMessage ?? 'Unknown error',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.grey.shade600,
                    ),
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {
                provider.refresh(studentId: widget.studentId);
              },
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (provider.grades.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.school_outlined,
              size: 64,
              color: Colors.grey.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              'No grades found',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Your grade records will appear here',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey.shade600,
                  ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => provider.refresh(studentId: widget.studentId),
      child: Column(
        children: [
          // Verification status indicator
          if (provider.isVerifying)
            Container(
              padding: const EdgeInsets.all(12),
              color: Colors.blue.shade50,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        Colors.blue.shade600,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Verifying grade integrity...',
                    style: TextStyle(
                      color: Colors.blue.shade700,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          
          // Grades list
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.only(top: 8, bottom: 16),
              itemCount: provider.grades.length,
              itemBuilder: (context, index) {
                final grade = provider.grades[index];
                return GradeCard(
                  grade: grade,
                  onRetryVerification: () {
                    provider.verifySingleGrade(grade.id);
                  },
                  onTap: () {
                    // Navigate to grade detail screen
                    // Navigator.push(context, ...);
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _showTamperedGradesDialog(BuildContext context, GradeProvider provider) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.report_problem, color: Colors.red),
            SizedBox(width: 8),
            Text('Tampered Records'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'The following grade records have failed integrity verification:',
            ),
            const SizedBox(height: 12),
            ...provider.tamperedGrades.map(
              (grade) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Text(
                  '• ${grade.courseCode} - ${grade.courseName}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'These records may have been modified. Please contact your administrator.',
              style: TextStyle(fontSize: 12),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.pop(context);
              provider.verifyAllGrades();
            },
            icon: const Icon(Icons.refresh),
            label: const Text('Re-verify All'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red.shade700,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}