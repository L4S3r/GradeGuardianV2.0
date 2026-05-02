import 'package:flutter/material.dart';
import 'dart:async';
import 'package:provider/provider.dart';
import '../widgets/add_grade_dialog.dart';
import '../providers/grade_provider.dart';
import '../widgets/grade_card.dart';
import '../widgets/shimmer_loaders.dart';
import 'batch_grade_screen.dart';

class GradesScreen extends StatefulWidget {
  final String? studentId;

  const GradesScreen({Key? key, this.studentId}) : super(key: key);

  @override
  State<GradesScreen> createState() => _GradesScreenState();
}

class _GradesScreenState extends State<GradesScreen> {
  final TextEditingController _searchController = TextEditingController();
  bool _isSearching = false;
  Timer? _debounce;
  String _selectedCourseFilter = 'All Courses';
  String _selectedSortOption = 'Date (Newest)';

  @override
  void initState() {
    super.initState();
    // Load grades when screen initializes
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<GradeProvider>().loadGrades(studentId: widget.studentId);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _debounce?.cancel();
    super.dispose();
  }

@override
Widget build(BuildContext context) {
  return Scaffold(
    appBar: AppBar(
      title: _isSearching
          ? TextField(
              controller: _searchController,
              autofocus: true,
              decoration: const InputDecoration(
                hintText: 'Search Course or Student ID...',
                border: InputBorder.none,
                hintStyle: TextStyle(color: Colors.white70),
              ),
              style: const TextStyle(color: Colors.white, fontSize: 18),
            onChanged: (value) {
              // Debounce search to avoid spamming the backend
              if (_debounce?.isActive ?? false) _debounce!.cancel();
              _debounce = Timer(const Duration(milliseconds: 500), () {
                context.read<GradeProvider>().refresh(
                  studentId: widget.studentId,
                  search: value.trim().isEmpty ? null : value.trim(),
                );
              });
            },
            )
          : const Text('Grade Records'),
      elevation: 0,
      actions: [
        IconButton(
          icon: Icon(_isSearching ? Icons.close : Icons.search),
          onPressed: () {
            setState(() {
              _isSearching = !_isSearching;
            if (!_isSearching) {
              _searchController.clear();
              // Reset the list when search is closed
              context.read<GradeProvider>().refresh(studentId: widget.studentId);
            }
            });
          },
        ),
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
        showModalBottomSheet(
          context: context,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
          ),
          builder: (context) => SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ListTile(
                  leading: const Icon(Icons.person_add),
                  title: const Text('Single Grade Entry'),
                  onTap: () {
                    Navigator.pop(context);
                    showDialog(
                      context: context,
                      builder: (context) => const AddGradeDialog(),
                    );
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.library_add),
                  title: const Text('Batch Grade Entry'),
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const BatchGradeScreen()),
                    );
                  },
                ),
              ],
            ),
          ),
        );
      },
      label: const Text('Add Grades'),
      icon: const Icon(Icons.add),
    ),
  ); 
}

  Widget _buildTamperAlertBanner(GradeProvider provider) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? Colors.red.shade900 : Colors.red.shade700,
        boxShadow: [
          BoxShadow(
            color: isDark ? Colors.black54 : Colors.red.shade200,
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
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (provider.isLoading) {
      return GradeCardShimmer();
    }

    if (provider.hasError) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Theme.of(context).colorScheme.error.withOpacity(0.7),
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
                      color: Theme.of(context).hintColor,
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
              color: Theme.of(context).hintColor.withOpacity(0.5),
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
                    color: Theme.of(context).hintColor,
                  ),
            ),
          ],
        ),
      );
    }

    if (provider.grades.isEmpty && _searchController.text.isNotEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.search_off_rounded,
              size: 64,
              color: Theme.of(context).hintColor.withOpacity(0.5),
            ),
            const SizedBox(height: 16),
            Text(
              'No matches found',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            const Text('Try searching for a different course or ID'),
          ],
        ),
      );
    }

    // Extract unique courses for the dropdown filter
    final uniqueCourses = ['All Courses', ...provider.grades.map((g) => g.courseCode).toSet().toList()..sort()];
    if (!uniqueCourses.contains(_selectedCourseFilter)) {
      _selectedCourseFilter = 'All Courses'; // Reset if course is no longer available
    }

    // Apply local filters and sorting
    var displayGrades = provider.grades.toList();
    
    if (_selectedCourseFilter != 'All Courses') {
      displayGrades = displayGrades.where((g) => g.courseCode == _selectedCourseFilter).toList();
    }

    if (_selectedSortOption == 'Grade (High to Low)') {
      displayGrades.sort((a, b) => b.grade.compareTo(a.grade));
    } else if (_selectedSortOption == 'Student ID (A-Z)') {
      displayGrades.sort((a, b) => a.studentId.compareTo(b.studentId));
    } else {
      displayGrades.sort((a, b) => b.recordedAt.compareTo(a.recordedAt));
    }

    return RefreshIndicator(
      onRefresh: () => provider.refresh(studentId: widget.studentId),
      child: Column(
        children: [
          // Verification status indicator
          if (provider.isVerifying)
            Container(
              padding: const EdgeInsets.all(12),
              color: isDark ? Colors.blue.shade900.withOpacity(0.3) : Colors.blue.shade50,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const CircularShimmer(size: 16),
                  const SizedBox(width: 12),
                  Text(
                    'Verifying grade integrity...',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.blue.shade200 : null,
                    ),
                  ),
                ],
              ),
            ),
          
          // Filter & Sort Toolbar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: Row(
              children: [
                Expanded(
                  flex: 1,
                  child: DropdownButtonFormField<String>(
                    decoration: InputDecoration(
                      labelText: 'Course Filter',
                      filled: true,
                      fillColor: Theme.of(context).colorScheme.surface,
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: Theme.of(context).dividerColor),
                      ),
                    ),
                    value: _selectedCourseFilter,
                    isExpanded: true,
                    icon: const Icon(Icons.filter_list, size: 16),
                    items: uniqueCourses.map((c) => DropdownMenuItem(
                      value: c, 
                      child: Text(c, style: const TextStyle(fontSize: 13), overflow: TextOverflow.ellipsis),
                    )).toList(),
                    onChanged: (val) => setState(() => _selectedCourseFilter = val!),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 1,
                  child: DropdownButtonFormField<String>(
                    decoration: InputDecoration(
                      labelText: 'Sort By',
                      filled: true,
                      fillColor: Theme.of(context).colorScheme.surface,
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: Theme.of(context).dividerColor),
                      ),
                    ),
                    value: _selectedSortOption,
                    isExpanded: true,
                    icon: const Icon(Icons.sort, size: 16),
                    items: ['Date (Newest)', 'Grade (High to Low)', 'Student ID (A-Z)']
                        .map((s) => DropdownMenuItem(
                          value: s, 
                          child: Text(s, style: const TextStyle(fontSize: 13), overflow: TextOverflow.ellipsis),
                        )).toList(),
                    onChanged: (val) => setState(() => _selectedSortOption = val!),
                  ),
                ),
              ],
            ),
          ),

          // Grades list
          Expanded(
            child: displayGrades.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.filter_list_off, size: 48, color: Theme.of(context).hintColor.withOpacity(0.5)),
                        const SizedBox(height: 16),
                        Text('No grades match your filters', style: Theme.of(context).textTheme.titleMedium),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.only(top: 8, bottom: 16),
                    itemCount: displayGrades.length,
                    itemBuilder: (context, index) {
                      final grade = displayGrades[index];
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
        title: Row(
          children: [
            Icon(Icons.report_problem, color: Theme.of(context).colorScheme.error),
            const SizedBox(width: 8),
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
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.error,
                  ),
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
              backgroundColor: Theme.of(context).colorScheme.error,
              foregroundColor: Theme.of(context).colorScheme.onError,
            ),
          ),
        ],
      ),
    );
  }
}