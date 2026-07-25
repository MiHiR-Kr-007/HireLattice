"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface ErrorTemplateProps {
    errorCode: string;
    title: string;
    description: string;
    imageSrc: string;
    imageAlt: string;
    Icon: LucideIcon;
    buttonText?: string;
    buttonLink?: string;
    themeClass?: string; // e.g. 'text-primary bg-primary/10' or 'text-destructive bg-destructive/10'
}

export function ErrorTemplate({
    errorCode,
    title,
    description,
    imageSrc,
    imageAlt,
    Icon,
    buttonText = "Return to Dashboard",
    buttonLink = "/",
    themeClass = "text-primary bg-primary/10"
}: ErrorTemplateProps) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-md text-center space-y-8"
            >
                <div className="relative w-72 h-72 mx-auto drop-shadow-2xl">
                    <Image
                        src={imageSrc}
                        alt={imageAlt}
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
                
                <div className="space-y-3">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-medium text-sm mb-2 ${themeClass}`}>
                        <Icon className="w-4 h-4" />
                        <span>Error {errorCode}</span>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
                        {title}
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        {description}
                    </p>
                </div>

                <div className="pt-4">
                    <Button asChild size="lg" className="shadow-ambient rounded-full">
                        <Link href={buttonLink}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {buttonText}
                        </Link>
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
