import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/grade_provider.dart';

class AuditLogSheet extends StatelessWidget {
  const AuditLogSheet({super.key});

  @override
  Widget build(BuildContext context) {
    final logs = context.watch<GradeProvider>().currentAuditLogs;

    return Container(
      padding: const EdgeInsets.all(16),
      height: MediaQuery.of(context).size.height * 0.6,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Integrity Audit Trail", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const Divider(),
          if (logs.isEmpty)
            const Expanded(child: Center(child: Text("No verification history found.")))
          else
            Expanded(
              child: ListView.builder(
                itemCount: logs.length,
                itemBuilder: (context, index) {
                  final log = logs[index];
                  return ListTile(
                    leading: Icon(
                      log.status == 'PASS' ? Icons.check_circle : Icons.warning,
                      color: log.status == 'PASS' ? Colors.green : Colors.red,
                    ),
                    title: Text(log.action),
                    subtitle: Text("${log.checkedAt.toLocal()}"),
                    trailing: log.errorDetails != null 
                      ? IconButton(
                          icon: const Icon(Icons.info_outline),
                          onPressed: () => _showError(context, log.errorDetails!),
                        )
                      : null,
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  void _showError(BuildContext context, String error) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(title: const Text("Error Details"), content: Text(error)),
    );
  }
}