import { ErrorTemplate } from "@/components/ui/error-template";
import { LockKeyhole } from "lucide-react";

export default function UnauthorizedPage() {
    return (
        <ErrorTemplate
            errorCode="401"
            title="Unauthorized"
            description="You need to log in to access this page. Please authenticate to verify your identity."
            imageSrc="/images/401.png"
            imageAlt="Character looking at missing ID or locked padlock"
            Icon={LockKeyhole}
            buttonText="Go to Login"
            buttonLink="/login"
            themeClass="text-destructive bg-destructive/10"
        />
    );
}
