"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Cone, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function MaintenancePage() {
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
                        src="/images/503.png"
                        alt="Maintenance worker with a construction cone"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
                
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-medium text-sm mb-2">
                        <Cone className="w-4 h-4" />
                        <span>Error 503</span>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
                        Under Maintenance
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        We are currently doing some heavy lifting behind the scenes to improve your experience. We'll be back shortly!
                    </p>
                </div>

                <div className="pt-4">
                    <Button asChild size="lg" className="shadow-ambient rounded-full">
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Return to Dashboard
                        </Link>
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
