import { ErrorTemplate } from "@/components/ui/error-template";
import { AlertCircle } from "lucide-react";

export default function BadRequestPage() {
    return (
        <ErrorTemplate
            errorCode="400"
            title="Bad Request"
            description="Oops! We couldn't process your request because the data seemed tangled or invalid. Please check your input and try again."
            imageSrc="/images/400.png"
            imageAlt="Character looking confused at a tangled mess of wires"
            Icon={AlertCircle}
            themeClass="text-destructive bg-destructive/10"
        />
    );
}
