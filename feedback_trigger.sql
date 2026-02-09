-- Create email notification trigger (run this AFTER the main setup)

DROP TRIGGER IF EXISTS on_feedback_created ON feedback;
DROP FUNCTION IF EXISTS send_feedback_notification();

CREATE OR REPLACE FUNCTION send_feedback_notification()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://uehjpftyvycbrketwhwg.supabase.co/functions/v1/feedbackNotification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('record', row_to_json(NEW))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_feedback_created
  AFTER INSERT ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION send_feedback_notification();
