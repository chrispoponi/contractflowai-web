-- Create trigger to send email notification when new feedback is submitted

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_feedback_created ON feedback;
DROP FUNCTION IF EXISTS send_feedback_notification();

-- Create function that calls the Edge Function
CREATE OR REPLACE FUNCTION send_feedback_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the Supabase Edge Function asynchronously
  PERFORM
    net.http_post(
      url := 'https://uehjpftyvycbrketwhwg.supabase.co/functions/v1/feedbackNotification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'record', row_to_json(NEW)
      )
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after insert
CREATE TRIGGER on_feedback_created
  AFTER INSERT ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION send_feedback_notification();
