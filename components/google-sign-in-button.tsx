
// "use client";

// import { useState } from "react";
// import { authClient } from "@/lib/auth-client";

// export default function GoogleSignInButton() {
//   const [isSigningIn, setIsSigningIn] = useState(false);
//   const [error, setError] = useState("");

//   async function handleGoogleSignIn() {
//     setIsSigningIn(true);
//     setError("");

//     try {
//       await authClient.signIn.social({
//         provider: "google",
//         callbackURL: "/",
//         errorCallbackURL: "/not-registered",
//       });
//     } catch {
//       setError("Sign-in failed. Please try again.");
//       setIsSigningIn(false);
//     }
//   }

//   return (
//     <div>
//       {error && (
//         <p role="alert" className="mb-4 text-sm text-red-400">
//           {error}
//         </p>
//       )}

//       <button
//         type="button"
//         onClick={handleGoogleSignIn}
//         disabled={isSigningIn}
//         className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
//       >
//         {isSigningIn ? "Redirecting to Google..." : "Continue with Google"}
//       </button>
//     </div>
//   );
// }




"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

type GoogleSignInButtonProps = {
  callbackURL?: string;
};

export default function GoogleSignInButton({
  callbackURL = "/",
}: GoogleSignInButtonProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState("");

  async function handleGoogleSignIn() {
    setIsSigningIn(true);
    setError("");

    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL,
        errorCallbackURL: "/not-registered",
      });
    } catch {
      setError("Sign-in failed. Please try again.");
      setIsSigningIn(false);
    }
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isSigningIn}
        className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSigningIn ? "Redirecting to Google..." : "Continue with Google"}
      </button>
    </div>
  );
}
