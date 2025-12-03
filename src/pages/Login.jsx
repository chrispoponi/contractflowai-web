import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createPageUrl } from "@/utils";
import {
  sendMagicLink,
  signInWithPassword,
  signUpWithPassword,
} from "@/lib/supabaseAuth";

const modes = [
  { id: "magic", label: "Magic Link" },
  { id: "signin", label: "Sign In" },
  { id: "signup", label: "Create Account" },
];

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);

  const redirectPath =
    searchParams.get("redirect") || createPageUrl("Dashboard");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    setError(null);

    try {
      if (!email) {
        throw new Error("Please enter an email address.");
      }

      if (mode === "magic") {
        await sendMagicLink(email, redirectPath);
        setFeedback(
          "Magic link sent! Check your email to finish signing in."
        );
        return;
      }

      if (!password) {
        throw new Error("Please enter your password.");
      }

      if (mode === "signup") {
        await signUpWithPassword({
          email,
          password,
          metadata: { full_name: fullName },
        });
        setFeedback(
          "Account created! Check your inbox to confirm your email."
        );
        setMode("signin");
        setPassword("");
        return;
      }

      await signInWithPassword(email, password);
      navigate(redirectPath);
    } catch (authError) {
      setError(authError.message || "Unable to complete request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <Link
            to={createPageUrl("Landing")}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            ← Back to ContractFlowAI
          </Link>
          <span className="text-sm text-gray-500">
            Need help? Email support@contractflowai.com
          </span>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-900">
              Sign in to continue
            </CardTitle>
            <p className="text-gray-500 mt-2">
              Access your dashboard and stay on top of every deadline.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 mb-8 flex-wrap">
              {modes.map((option) => (
                <Button
                  key={option.id}
                  type="button"
                  variant={mode === option.id ? "default" : "outline"}
                  onClick={() => {
                    setMode(option.id);
                    setFeedback(null);
                    setError(null);
                  }}
                  className={`flex-1 min-w-[140px] ${
                    mode === option.id ? "bg-[#1e3a5f]" : ""
                  }`}
                >
                  {option.label}
                </Button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              {mode !== "magic" && (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter a secure password"
                    required
                  />
                </div>
              )}

              {mode === "signup" && (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <Input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>
              )}

              {feedback && (
                <Alert className="bg-green-50 border-green-200 text-green-800">
                  <AlertDescription>{feedback}</AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#1e3a5f] hover:bg-[#2d4a6f]"
              >
                {isSubmitting ? "Please wait..." : "Continue"}
              </Button>
            </form>

            <p className="text-xs text-gray-500 mt-6 text-center">
              By continuing you agree to the ContractFlowAI Terms of Service and
              Privacy Policy.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
