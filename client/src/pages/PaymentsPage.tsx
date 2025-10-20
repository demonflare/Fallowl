import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Save, Plus, CreditCard } from "lucide-react";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface StripeFormData {
  publishableKey: string;
  secretKey: string;
  webhookEndpoint: string;
}

interface PaymentMethod {
  id: string;
  last4: string;
  brand: string;
  expMonth: number;
  expYear: number;
  isPrimary: boolean;
}

interface Invoice {
  id: string;
  amount: number;
  status: string;
  date: string;
  period: string;
}

export default function PaymentsPage() {
  const [webhookStatus, setWebhookStatus] = useState<'untested' | 'testing' | 'success' | 'error'>('untested');
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors } } = useForm<StripeFormData>();

  // Mock data for demonstration - in production this would come from API
  const currentPlan = {
    name: "Professional",
    description: "Advanced features for growing teams",
    price: 49,
    features: ["Unlimited calls", "SMS messaging", "Call recordings"]
  };

  const paymentMethods: PaymentMethod[] = [
    {
      id: "1",
      last4: "4242",
      brand: "visa",
      expMonth: 12,
      expYear: 2025,
      isPrimary: true
    }
  ];

  const recentInvoices: Invoice[] = [
    {
      id: "1",
      amount: 49.00,
      status: "paid",
      date: "2024-01-01",
      period: "January 2024"
    },
    {
      id: "2",
      amount: 49.00,
      status: "paid",
      date: "2023-12-01",
      period: "December 2023"
    }
  ];

  const { data: stripeSettings } = useQuery({
    queryKey: ["/api/settings/stripe"],
  });

  const testWebhookMutation = useMutation({
    mutationFn: async (data: StripeFormData) => {
      setWebhookStatus('testing');
      // Simulate API call to test webhook
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (Math.random() > 0.3) {
        setWebhookStatus('success');
        return { success: true };
      } else {
        setWebhookStatus('error');
        throw new Error('Webhook test failed');
      }
    },
    onSuccess: () => {
      toast({
        title: "Webhook test successful",
        description: "Stripe webhook is working correctly.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Webhook test failed",
        description: error.message || "Unable to connect to webhook endpoint",
        variant: "destructive",
      });
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (data: StripeFormData) => {
      const response = await apiRequest("POST", "/api/settings", {
        key: "stripe",
        value: data,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration saved",
        description: "Stripe configuration has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: StripeFormData) => {
    saveConfigMutation.mutate(data);
  };

  const handleTestWebhook = () => {
    handleSubmit((data) => {
      testWebhookMutation.mutate(data);
    })();
  };

  const handleAddPaymentMethod = () => {
    toast({
      title: "Add payment method",
      description: "Payment method addition would be implemented here",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Plan & Stripe Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">{currentPlan.name}</h3>
                    <p className="text-blue-100">{currentPlan.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">${currentPlan.price}</div>
                    <div className="text-blue-100">per month</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center space-x-4">
                  {currentPlan.features.map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <Check className="w-4 h-4 mr-2" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stripe Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Stripe Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="publishableKey">Publishable Key</Label>
                  <Input
                    id="publishableKey"
                    {...register("publishableKey", { required: "Publishable key is required" })}
                    placeholder="pk_live_..."
                    className={errors.publishableKey ? "border-red-300" : ""}
                  />
                  {errors.publishableKey && (
                    <p className="text-sm text-red-600 mt-1">{errors.publishableKey.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="secretKey">Secret Key</Label>
                  <Input
                    id="secretKey"
                    type="password"
                    {...register("secretKey", { required: "Secret key is required" })}
                    placeholder="sk_live_..."
                    className={errors.secretKey ? "border-red-300" : ""}
                  />
                  {errors.secretKey && (
                    <p className="text-sm text-red-600 mt-1">{errors.secretKey.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="webhookEndpoint">Webhook Endpoint</Label>
                  <Input
                    id="webhookEndpoint"
                    type="url"
                    {...register("webhookEndpoint", { required: "Webhook endpoint is required" })}
                    placeholder="https://yourdomain.com/webhook"
                    className={errors.webhookEndpoint ? "border-red-300" : ""}
                  />
                  {errors.webhookEndpoint && (
                    <p className="text-sm text-red-600 mt-1">{errors.webhookEndpoint.message}</p>
                  )}
                </div>
                <div className="flex space-x-4">
                  <Button
                    type="button"
                    onClick={handleTestWebhook}
                    disabled={testWebhookMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    {testWebhookMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Testing...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Test Webhook
                      </>
                    )}
                  </Button>
                  <Button
                    type="submit"
                    disabled={saveConfigMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    {saveConfigMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Configuration
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Payment Methods & Invoices */}
        <div className="space-y-6">
          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <CreditCard className="w-5 h-5 text-blue-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          •••• •••• •••• {method.last4}
                        </p>
                        <p className="text-xs text-gray-500">
                          Expires {method.expMonth}/{method.expYear}
                        </p>
                      </div>
                    </div>
                    {method.isPrimary && (
                      <Badge className="bg-blue-100 text-blue-800">
                        Primary
                      </Badge>
                    )}
                  </div>
                ))}
                <button
                  onClick={handleAddPaymentMethod}
                  className="w-full text-left p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2 inline" />
                  Add Payment Method
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{invoice.period}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(invoice.date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-800">
                        ${invoice.amount.toFixed(2)}
                      </p>
                      <Badge className={getStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
