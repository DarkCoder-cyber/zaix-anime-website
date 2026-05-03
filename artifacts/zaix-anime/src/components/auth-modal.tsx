import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const LoginBody = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const RegisterBody = z.object({
  username: z.string().min(2, "Username must be at least 2 characters").max(30, "Username too long"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Extend RegisterBody to include confirmPassword
const RegisterSchema = RegisterBody.extend({
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export function AuthModal() {
  const { isModalOpen, setModalOpen, modalTab, setModalTab, login, register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const loginForm = useForm<z.infer<typeof LoginBody>>({
    resolver: zodResolver(LoginBody),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<z.infer<typeof RegisterSchema>>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { username: "", email: "", password: "", confirmPassword: "" },
  });

  const extractMessage = (error: any, fallback: string): string => {
    if (error?.data?.error) return error.data.error;
    if (typeof error?.data === "string" && error.data.trim()) return error.data;
    if (error?.message && !error.message.startsWith("HTTP ")) return error.message;
    if (error?.status === 409) return "An account with this email already exists.";
    if (error?.status === 400) return "Please check your details and try again.";
    if (error?.status === 401) return "Invalid email or password.";
    if (error?.status === 0 || error?.name === "TypeError") return "Cannot reach the server. Please try again.";
    return fallback;
  };

  const onLogin = async (data: z.infer<typeof LoginBody>) => {
    try {
      await login({ data });
    } catch (error: any) {
      loginForm.setError("root", { message: extractMessage(error, "Failed to login. Please check your credentials.") });
    }
  };

  const onRegister = async (data: z.infer<typeof RegisterSchema>) => {
    try {
      const { confirmPassword, ...registerData } = data;
      await register({ data: registerData });
    } catch (error: any) {
      registerForm.setError("root", { message: extractMessage(error, "Failed to create account. Please try again.") });
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(32px) saturate(200%)", WebkitBackdropFilter: "blur(32px) saturate(200%)", border: "1px solid rgba(168,85,247,0.35)", boxShadow: "0 0 60px rgba(168,85,247,0.15), 0 25px 50px rgba(0,0,0,0.8)" }}>
        <DialogTitle className="sr-only">Authentication</DialogTitle>
        <div className="p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold font-heading text-primary text-shadow-neon tracking-wider">ZAIX ANIME</h2>
            <p className="text-muted-foreground text-sm mt-1">Join the ultimate streaming experience</p>
          </div>

          <Tabs value={modalTab} onValueChange={(v) => setModalTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-black/40 border border-primary/20">
              <TabsTrigger value="login" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary" data-testid="tab-login">Login</TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary" data-testid="tab-signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="name@example.com" {...field} className="bg-black/50 border-primary/30 focus-visible:ring-primary focus-visible:border-primary" data-testid="input-login-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              {...field} 
                              className="bg-black/50 border-primary/30 focus-visible:ring-primary focus-visible:border-primary pr-10"
                              data-testid="input-login-password"
                            />
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-primary"
                              onClick={() => setShowPassword(!showPassword)}
                              data-testid="button-login-toggle-password"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {loginForm.formState.errors.root && (
                    <div className="text-destructive text-sm font-medium" data-testid="error-login-root">
                      {loginForm.formState.errors.root.message}
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full bg-primary text-black hover:bg-primary/90 shadow-neon mt-2" 
                    disabled={loginForm.formState.isSubmitting}
                    data-testid="button-login-submit"
                  >
                    {loginForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Login
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="OtakuFan99" {...field} className="bg-black/50 border-primary/30 focus-visible:ring-primary focus-visible:border-primary" data-testid="input-register-username" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="name@example.com" {...field} className="bg-black/50 border-primary/30 focus-visible:ring-primary focus-visible:border-primary" data-testid="input-register-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              {...field} 
                              className="bg-black/50 border-primary/30 focus-visible:ring-primary focus-visible:border-primary pr-10"
                              data-testid="input-register-password"
                            />
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-primary"
                              onClick={() => setShowPassword(!showPassword)}
                              data-testid="button-register-toggle-password"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="••••••••" 
                            {...field} 
                            className="bg-black/50 border-primary/30 focus-visible:ring-primary focus-visible:border-primary"
                            data-testid="input-register-confirm-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {registerForm.formState.errors.root && (
                    <div className="text-destructive text-sm font-medium" data-testid="error-register-root">
                      {registerForm.formState.errors.root.message}
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full bg-primary text-black hover:bg-primary/90 shadow-neon mt-2" 
                    disabled={registerForm.formState.isSubmitting}
                    data-testid="button-register-submit"
                  >
                    {registerForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
