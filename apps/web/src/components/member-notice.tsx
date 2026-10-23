import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";

export default function MemberNotice({
  failed = false,
  onRetry,
}: {
  failed?: boolean;
  onRetry?: () => void;
}) {
  return (
    <Alert className="mt-6 max-w-3xl">
      <AlertDescription>
        {failed
          ? "Could not check your team membership. Try again to make changes."
          : "Your verified email is not a team member. You can view Teamdesk, but cannot make changes."}
        {failed ? (
          <Button
            className="ml-3"
            onClick={onRetry}
            size="sm"
            variant="outline"
          >
            Retry
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
