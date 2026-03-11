import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, ArrowLeft, Shield, Users, Phone, Radio, Bell, Settings, FileText, MapPin } from "lucide-react";
import UsersTab from "@/components/admin/UsersTab";
import RegisteredNumbersTab from "@/components/admin/RegisteredNumbersTab";
import GpsDevicesTab from "@/components/admin/GpsDevicesTab";
import AlarmsHistoryTab from "@/components/admin/AlarmsHistoryTab";
import SettingsTab from "@/components/admin/SettingsTab";
import ReportsTab from "@/components/admin/ReportsTab";
import ParcelsTab from "@/components/admin/ParcelsTab";

export default function AdminPanel() {
  const { user, role, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || role !== "admin")) {
      navigate("/login");
    }
  }, [loading, user, role, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!user || role !== "admin") return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emergency-panic/10 border border-emergency-panic/30 flex items-center justify-center">
                <Shield className="w-4 h-4 text-emergency-panic" />
              </div>
              <div>
                <h1 className="text-lg font-display font-bold">Panel de Administración</h1>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/login"); }}>
            <LogOut className="w-4 h-4 mr-1" /> Salir
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="users">
          <TabsList className="grid w-full grid-cols-7 mb-6">
            <TabsTrigger value="users" className="gap-1 text-xs sm:text-sm">
              <Users className="w-4 h-4" /> <span className="hidden sm:inline">Usuarios</span>
            </TabsTrigger>
            <TabsTrigger value="numbers" className="gap-1 text-xs sm:text-sm">
              <Phone className="w-4 h-4" /> <span className="hidden sm:inline">WhatsApp</span>
            </TabsTrigger>
            <TabsTrigger value="parcels" className="gap-1 text-xs sm:text-sm">
              <MapPin className="w-4 h-4" /> <span className="hidden sm:inline">Parcelas</span>
            </TabsTrigger>
            <TabsTrigger value="gps" className="gap-1 text-xs sm:text-sm">
              <Radio className="w-4 h-4" /> <span className="hidden sm:inline">GPS</span>
            </TabsTrigger>
            <TabsTrigger value="alarms" className="gap-1 text-xs sm:text-sm">
              <Bell className="w-4 h-4" /> <span className="hidden sm:inline">Alarmas</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1 text-xs sm:text-sm">
              <FileText className="w-4 h-4" /> <span className="hidden sm:inline">Reportes</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1 text-xs sm:text-sm">
              <Settings className="w-4 h-4" /> <span className="hidden sm:inline">Config</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="numbers"><RegisteredNumbersTab /></TabsContent>
          <TabsContent value="parcels"><ParcelsTab /></TabsContent>
          <TabsContent value="gps"><GpsDevicesTab /></TabsContent>
          <TabsContent value="alarms"><AlarmsHistoryTab /></TabsContent>
          <TabsContent value="reports"><ReportsTab /></TabsContent>
          <TabsContent value="settings"><SettingsTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
