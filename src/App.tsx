import type React from "react";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Upload,
  Play,
  Shield,
  CheckCircle,
  FileText,
  Clock,
  Download,
  Moon,
  Sun,
  // Pencil,
} from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { useTheme } from "./components/theme-provider";
import { memory64 } from "wasm-feature-detect";
import hljs from "highlight.js/lib/core";
import cairo from "highlightjs-cairo";
import {
  init,
  debug,
  execute as stwoExecute,
  prove as stwoProve,
  verify as stwoVerify,
  containsPedersenBuiltin,
} from "stwo-cairo";
import { PREDEFINED_EXAMPLES } from "./examples";
import {
  blake2s,
  feltToBytes,
  hexToFelt,
  pmvToBytesLE,
  pmvToFelt,
} from "./utils";

interface ExecutionResult {
  proverInput: string;
  executionTime: number;
}

interface ProofResult {
  proof: string;
  provingTime: number;
}

export default function App() {
  const [selectedExecutable, setSelectedExecutable] = useState<string>("");
  const [sourceCode, setSourceCode] = useState<string>("");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [selectedExample, setSelectedExample] = useState<string>("");
  const [arguments_, setArguments] = useState<string>("");
  const [executionResult, setExecutionResult] =
    useState<ExecutionResult | null>(null);
  const [proofResult, setProofResult] = useState<ProofResult | null>(null);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(
    null
  );
  const [isExecuting, setIsExecuting] = useState(false);
  const [isProving, setIsProving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [withPedersen, setWithPedersen] = useState<boolean | null>(null);
  const [verificationTime, setVerificationTime] = useState<number>(0);
  const [memory64Support, setMemory64Support] = useState<boolean | null>(null);
  const [browserInfo, setBrowserInfo] = useState<string>("");
  const [isChromeMacArm, setIsChromeMacArm] = useState<boolean>(false);
  const [isEditingSource, _setIsEditingSource] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLElement | null>(null);
  const { theme, setTheme } = useTheme();
  const resetResults = useCallback(() => {
    setExecutionResult(null);
    setProofResult(null);
    setVerificationResult(null);
  }, []);

  useEffect(() => {
    init().then(() => {
      debug();
    });
  }, []);

  useEffect(() => {
    // register cairo language once
    if (!hljs.listLanguages().includes("cairo")) {
      try {
        hljs.registerLanguage("cairo", cairo as any);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (isEditingSource) return; // don't highlight while editing
    if (!codeRef.current) return;
    if (!sourceCode) {
      codeRef.current.textContent = "";
      return;
    }
    codeRef.current.className = "language-cairo";
    codeRef.current.textContent = sourceCode;
    try {
      const { value } = hljs.highlight(sourceCode, {
        language: "cairo",
        ignoreIllegals: true,
      });
      codeRef.current.innerHTML = value;
    } catch {
      codeRef.current.textContent = sourceCode;
    }
  }, [sourceCode, selectedExample, isEditingSource]);

  useEffect(() => {
    const darkHref =
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark-dimmed.min.css";
    const lightHref =
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css";

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
    const computeEffective = () =>
      theme === "system" ? (prefersDark.matches ? "dark" : "light") : theme;

    const apply = () => {
      const effective = computeEffective();
      const id = "hljs-theme";
      let link = document.getElementById(id) as HTMLLinkElement | null;
      const desired = effective === "dark" ? darkHref : lightHref;
      if (link && link.getAttribute("href") === desired) return;
      if (!link) {
        link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }
      link.href = desired;
    };

    apply();
    if (theme === "system") {
      const handler = () => apply();
      prefersDark.addEventListener("change", handler);
      return () => prefersDark.removeEventListener("change", handler);
    }
  }, [theme]);

  useEffect(() => {
    const detectMemory64Support = async () => {
      try {
        const userAgent = navigator.userAgent;
        let browser = "Unknown";
        let version = "Unknown";

        if (userAgent.includes("Chrome")) {
          const match = userAgent.match(/Chrome\/(\d+)/);
          browser = "Chrome";
          version = match ? match[1] : "Unknown";
        } else if (userAgent.includes("Firefox")) {
          const match = userAgent.match(/Firefox\/(\d+)/);
          browser = "Firefox";
          version = match ? match[1] : "Unknown";
        } else if (
          userAgent.includes("Safari") &&
          !userAgent.includes("Chrome")
        ) {
          const match = userAgent.match(/Version\/(\d+)/);
          browser = "Safari";
          version = match ? match[1] : "Unknown";
        } else if (userAgent.includes("Edge")) {
          const match = userAgent.match(/Edg\/(\d+)/);
          browser = "Edge";
          version = match ? match[1] : "Unknown";
        }

        setBrowserInfo(`${browser} ${version}`);

        // Detect Chrome on macOS running on ARM (Apple Silicon)
        try {
          const ua = userAgent;
          const isEdge = /Edg\//.test(ua);
          const isChrome = !isEdge && /Chrome\/(\d+)/.test(ua);
          let isMac = /(Macintosh|Mac OS X)/.test(ua);
          let isArm = /(arm|aarch64|apple silicon)/i.test(ua);

          const anyNav: any = navigator as any;
          if (
            anyNav.userAgentData &&
            typeof anyNav.userAgentData.getHighEntropyValues === "function"
          ) {
            try {
              const high = await anyNav.userAgentData.getHighEntropyValues([
                "architecture",
                "platform",
                "model",
                "bitness",
                "uaFullVersion",
              ]);
              if (high && typeof high.platform === "string") {
                isMac = /mac/i.test(high.platform);
              }
              if (high && typeof high.architecture === "string") {
                isArm = /arm/i.test(high.architecture);
              }
            } catch {
              // ignore — fall back to UA heuristics
            }
          }

          setIsChromeMacArm(isChrome && isMac && isArm);
        } catch {
          setIsChromeMacArm(false);
        }

        try {
          const isSupported = await memory64();
          setMemory64Support(isSupported);
        } catch {
          setMemory64Support(false);
        }
      } catch {
        setMemory64Support(false);
        setBrowserInfo("Unknown");
        setIsChromeMacArm(false);
      }
    };

    detectMemory64Support();
  }, []);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.type !== "application/json") {
        sonnerToast.error("Invalid file type — Please upload a JSON file.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          JSON.parse(content);
          setSelectedExecutable(content);
          setSourceCode("");
          setUploadedFileName(file.name);
          setSelectedExample("");
          resetResults();
        } catch (error) {
          sonnerToast.error(
            "Invalid JSON — The uploaded file contains invalid JSON."
          );
        }
      };
      reader.readAsText(file);
    },
    [resetResults]
  );

  const handlePredefinedSelect = useCallback(
    (example: (typeof PREDEFINED_EXAMPLES)[0]) => {
      setSelectedExecutable(example.executable);
      setSourceCode(example.sourceCode);
      setUploadedFileName("");
      setSelectedExample(example.name);
    },
    []
  );

  const parseArguments = useCallback((argsString: string): bigint[] => {
    if (!argsString.trim()) return [];

    try {
      const args = argsString.split(",").map((arg) => {
        const trimmed = arg.trim();
        if (trimmed === "") {
          throw new Error("Empty argument found");
        }
        if (!/^-?\d+$/.test(trimmed)) {
          throw new Error(
            `Invalid argument: "${trimmed}" is not a valid integer`
          );
        }
        return BigInt(trimmed);
      });
      return args;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(
        "Invalid arguments. Please provide comma-separated integers."
      );
    }
  }, []);

  const handleExecute = useCallback(async () => {
    if (!selectedExecutable) return;

    let args: bigint[] = [];
    try {
      args = parseArguments(arguments_);
    } catch (error) {
      sonnerToast.error(
        `Invalid arguments — ${
          error instanceof Error
            ? error.message
            : "Please provide valid comma-separated integers."
        }
        `
      );
      return;
    }

    setIsExecuting(true);
    const startTime = Date.now();
    try {
      const proverInput = await stwoExecute(selectedExecutable, ...args);
      const executionTime = Date.now() - startTime;
      setExecutionResult({ proverInput, executionTime });
      const pedersen = containsPedersenBuiltin(proverInput);
      setWithPedersen(pedersen);
      sonnerToast.success(
        `Execution completed — Program executed in ${executionTime}ms${
          pedersen ? " (Pedersen builtin)" : ""
        }`
      );
    } catch (error) {
      sonnerToast.error(
        `Execution failed — ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsExecuting(false);
    }
  }, [selectedExecutable, arguments_, parseArguments]);

  const handleProve = useCallback(async () => {
    if (!executionResult) return;
    setIsProving(true);
    const startTime = Date.now();
    try {
      const proof = await stwoProve(executionResult.proverInput);
      const provingTime = Date.now() - startTime;
      setProofResult({ proof, provingTime });
      sonnerToast.success(`Proof generated — Generated in ${provingTime}ms`);
    } catch (error) {
      sonnerToast.error(
        `Proof generation failed — ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsProving(false);
    }
  }, [executionResult]);

  const downloadJson = useCallback((data: string, filename: string) => {
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleVerify = useCallback(async () => {
    if (!proofResult) return;
    setIsVerifying(true);
    const startTime = Date.now();
    try {
      const verdict = await stwoVerify(
        proofResult.proof,
        Boolean(withPedersen)
      );
      const verifyTime = Date.now() - startTime;
      setVerificationResult(verdict);
      setVerificationTime(verifyTime);
      if (verdict) {
        sonnerToast.success(
          `Verification successful — Proof verified in ${verifyTime}ms`
        );
      } else {
        sonnerToast.error(
          `Verification failed — Proof rejected in ${verifyTime}ms`
        );
      }
    } catch (error) {
      sonnerToast.error(
        `Verification failed — ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsVerifying(false);
    }
  }, [proofResult, withPedersen]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                ⚡ S-two Cairo Demo
              </h1>
              <p className="text-muted-foreground">
                Interactive demonstration of the{" "}
                <a
                  href="https://www.npmjs.com/package/stwo-cairo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  S-two Cairo TypeScript library
                </a>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                <div className="text-sm">
                  <div className="font-medium text-foreground">
                    {browserInfo}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Memory64:</span>
                    {memory64Support === null ? (
                      <span className="text-muted-foreground">Checking...</span>
                    ) : memory64Support ? (
                      isChromeMacArm ? (
                        <a
                          href="https://github.com/clealabs/stwo-cairo-ts/issues/2"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-600 hover:underline"
                        >
                          Unsupported (chrome bug)
                        </a>
                      ) : (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Supported
                        </span>
                      )
                    ) : (
                      <span className="text-red-600">Not supported</span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="h-9 w-9"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* File Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Select Executable
            </CardTitle>
            <CardDescription>
              Choose a predefined example or upload your own Cairo executable
              JSON file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PREDEFINED_EXAMPLES.map((example, index) => (
                <Button
                  key={index}
                  variant={
                    selectedExample === example.name ? "default" : "outline"
                  }
                  onClick={() => handlePredefinedSelect(example)}
                  className="h-auto p-4 text-left justify-start"
                >
                  <div>
                    <div className="font-medium">{example.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Predefined example
                    </div>
                  </div>
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Upload JSON File
              </Button>
              {uploadedFileName && (
                <Button
                  variant={
                    uploadedFileName && !selectedExample ? "default" : "outline"
                  }
                  className="flex items-center gap-2"
                  disabled
                >
                  <FileText className="h-4 w-4" />
                  {uploadedFileName}
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {sourceCode && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    Source Code {isEditingSource ? "(editable)" : "(read-only)"}
                  </Label>
                  {/* <Button // TODO: allow editing program and recompiling when stwo-cairo supports it
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingSource((v) => !v)}
                    className="flex items-center gap-1"
                  >
                    <Pencil className="h-3 w-3" />
                    {isEditingSource ? "View" : "Edit"}
                  </Button> */}
                  <div />
                </div>
                {isEditingSource ? (
                  <Textarea
                    value={sourceCode}
                    onChange={(e) => setSourceCode(e.target.value)}
                    className="font-mono text-sm min-h-[200px] bg-muted"
                  />
                ) : (
                  <div className="relative">
                    <pre className="font-mono text-sm min-h-[200px] bg-muted rounded-md p-3 overflow-auto">
                      <code ref={codeRef} className="language-cairo" />
                    </pre>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Execution Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Execute Program
            </CardTitle>
            <CardDescription>
              Provide arguments and execute the Cairo program
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="arguments">
                Arguments (comma-separated bigint values)
              </Label>
              <Input
                id="arguments"
                placeholder="100, 200, 300"
                className="placeholder:text-muted-foreground/40"
                value={arguments_}
                onChange={(e) => setArguments(e.target.value)}
                disabled={!selectedExecutable}
              />
            </div>

            <Button
              onClick={handleExecute}
              disabled={!selectedExecutable || isExecuting}
              className="w-full"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Execute
                </>
              )}
            </Button>

            {executionResult && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <Clock className="h-3 w-3" />
                    {executionResult.executionTime}ms
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Prover Input</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        downloadJson(
                          executionResult.proverInput,
                          "prover-input.json"
                        )
                      }
                      className="flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </Button>
                  </div>
                  <Textarea
                    value={executionResult.proverInput}
                    readOnly
                    className="font-mono text-sm min-h-[150px] h-48 bg-muted overflow-auto"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Proof Generation Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Generate Proof
            </CardTitle>
            <CardDescription>
              Generate a STARK proof of the execution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleProve}
              disabled={!executionResult || isProving}
              className="w-full"
            >
              {isProving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Proof...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Generate Proof
                </>
              )}
            </Button>

            {proofResult && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <Clock className="h-3 w-3" />
                    {proofResult.provingTime}ms
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label>Claimed Output</Label>
                  <div className="p-3 bg-muted rounded-lg font-mono text-sm">
                    {(() => {
                      try {
                        const parsedProof = JSON.parse(proofResult.proof);
                        const outputs =
                          parsedProof.claim?.public_data?.public_memory
                            ?.output || [];
                        if (outputs.length === 0) {
                          return (
                            <span className="text-muted-foreground">
                              No outputs claimed
                            </span>
                          );
                        }
                        return (
                          <div className="space-y-1">
                            {outputs.map((output: any, index: number) => (
                              <div
                                key={index}
                                className="flex items-center gap-2"
                              >
                                <span className="text-muted-foreground">
                                  [{index}]:
                                </span>
                                <span className="text-foreground">
                                  {pmvToFelt(output)}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      } catch {
                        return (
                          <span className="text-muted-foreground">
                            Unable to parse claimed outputs
                          </span>
                        );
                      }
                    })()}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Claimed Program Hash</Label>
                  <div className="p-3 bg-muted rounded-lg font-mono text-sm">
                    {(() => {
                      try {
                        const parsedProof = JSON.parse(proofResult.proof);
                        const parsedExecutable = JSON.parse(
                          selectedExecutable || "{}"
                        );

                        const claimedBytecode =
                          parsedProof.claim.public_data.public_memory.program ||
                          [];
                        const executableBytecode =
                          parsedExecutable.program?.bytecode || [];

                        if (claimedBytecode.length === 0) {
                          return (
                            <span className="text-muted-foreground">
                              No program bytecode in claim
                            </span>
                          );
                        }

                        const claimedHash = blake2s(
                          claimedBytecode.map(pmvToBytesLE)
                        );
                        const executableHash = blake2s(
                          executableBytecode.map(hexToFelt).map(feltToBytes)
                        );
                        const matches = claimedHash === executableHash;

                        return (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                Claimed:
                              </span>
                              <span className="text-foreground">
                                {claimedHash}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                Executable:
                              </span>
                              <span className="text-foreground">
                                {executableHash}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                Match:
                              </span>
                              <Badge
                                variant={matches ? "default" : "destructive"}
                                className="text-xs"
                              >
                                {matches ? "✓ Yes" : "✗ No"}
                              </Badge>
                            </div>
                          </div>
                        );
                      } catch (e) {
                        console.error(e);
                        return (
                          <span className="text-muted-foreground">
                            Unable to parse program hashes
                          </span>
                        );
                      }
                    })()}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Generated Proof</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        downloadJson(proofResult.proof, "proof.json")
                      }
                      className="flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </Button>
                  </div>
                  <Textarea
                    value={proofResult.proof}
                    readOnly
                    className="font-mono text-sm min-h-[150px] h-48 bg-muted overflow-auto"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verification Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Verify Proof
            </CardTitle>
            <CardDescription>Verify the generated STARK proof</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleVerify}
              disabled={!proofResult || isVerifying}
              className="w-full"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Verify Proof
                </>
              )}
            </Button>

            {verificationResult !== null && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={verificationResult ? "default" : "destructive"}
                    className="flex items-center gap-1"
                  >
                    <CheckCircle className="h-3 w-3" />
                    {verificationResult ? "Verified" : "Failed"}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <Clock className="h-3 w-3" />
                    {verificationTime}ms
                  </Badge>
                  {withPedersen != null && (
                    <Badge variant="secondary" className="text-xs">
                      {withPedersen ? "Pedersen" : "No Pedersen"}
                    </Badge>
                  )}
                </div>
                <div
                  className={`p-4 rounded-lg ${
                    verificationResult
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {verificationResult
                    ? "Proof verification successful! The execution proof is valid."
                    : "Proof verification failed. The proof could not be validated."}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <SonnerToaster />
    </div>
  );
}
