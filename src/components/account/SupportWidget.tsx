import React, { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

export const SupportWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={()=>setOpen(true)} className="fixed bottom-4 left-4 z-40 support-widget">Support</Button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Need help?</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">Email us at support@regiq.com or describe your issue below.</p>
            <textarea className="w-full h-32 border rounded p-2 bg-background" placeholder="Describe your issue..." />
            <div className="text-right">
              <Button onClick={()=>setOpen(false)}>Send</Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default SupportWidget;
