import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const TeamManagement: React.FC = () => {
  const [emails, setEmails] = useState<string>(localStorage.getItem('team_invites') || '');

  const save = () => {
    localStorage.setItem('team_invites', emails);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Team Management</CardTitle>
        <CardDescription>Add/remove users (coming soon). Invite emails below to prepare.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input value={emails} onChange={(e:any)=>setEmails(e.target.value)} placeholder="team1@example.com, team2@example.com" />
        <div className="flex justify-end">
          <Button onClick={save}>Save Invites</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamManagement;
