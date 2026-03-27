import 'package:flutter_test/flutter_test.dart';

import 'package:app/main.dart';

void main() {
  testWidgets('App shows auth title', (WidgetTester tester) async {
    await tester.pumpWidget(const MahjongApp(fcmToken: 'test-token'));
    await tester.pumpAndSettle();

    expect(find.text('麻將配對'), findsOneWidget);
  });
}
