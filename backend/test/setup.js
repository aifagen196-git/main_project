// Dummy settings so modules that create a Supabase client can be imported in
// tests. Nothing here talks to a real database; tests that would are not in
// this folder.
process.env.SUPABASE_URL ||= "http://127.0.0.1:9";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-key";
process.env.RAZORPAY_KEY_ID ||= "rzp_test_dummy";
process.env.RAZORPAY_KEY_SECRET ||= "dummy-secret";
process.env.RAZORPAY_WEBHOOK_SECRET ||= "dummy-webhook-secret";
