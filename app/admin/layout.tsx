import { cn } from "@/lib/utils";
import Link from "next/link";
import { AdminPageTransition } from "@/components/admin/AdminPageTransition";
import { 
  Users, 
  Settings, 
  Home, 
  FileText,
  BarChart,
  Globe
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-[calc(100vh-4rem)]"> {/* Assuming Topbar is ~4rem */}
      <aside className="w-64 border-r border-border/50 flex-shrink-0 bg-muted/30">
        <nav className="flex flex-col gap-2 p-4 h-full">
          <div className="text-sm font-medium text-muted-foreground mb-4 px-2">
            Administração
          </div>
          
          <Link 
            href="/admin" 
            className="group flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent/80 hover:text-accent-foreground transition-all duration-200 text-sm"
          >
            <Home className="h-4 w-4 transition-transform group-hover:scale-110" />
            Dashboard
          </Link>
          
          <Link 
            href="/admin/delegates" 
            className="group flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent/80 hover:text-accent-foreground transition-all duration-200 text-sm"
          >
            <Users className="h-4 w-4 transition-transform group-hover:scale-110" />
            Delegados
          </Link>

          <Link 
            href="/admin/committees" 
            className="group flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent/80 hover:text-accent-foreground transition-all duration-200 text-sm"
          >
            <Globe className="h-4 w-4 transition-transform group-hover:scale-110" />
            Comitês
          </Link>
          
          <Link 
            href="/admin/documents" 
            className="group flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent/80 hover:text-accent-foreground transition-all duration-200 text-sm"
          >
            <FileText className="h-4 w-4 transition-transform group-hover:scale-110" />
            Documentos
          </Link>
          
          <Link 
            href="/admin/reports" 
            className="group flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent/80 hover:text-accent-foreground transition-all duration-200 text-sm"
          >
            <BarChart className="h-4 w-4 transition-transform group-hover:scale-110" />
            Relatórios
          </Link>
          
          <div className="mt-auto">
            <Link 
              href="/admin/settings" 
              className="group flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent/80 hover:text-accent-foreground transition-all duration-200 text-sm"
            >
              <Settings className="h-4 w-4 transition-transform group-hover:scale-110 group-hover:rotate-45" />
              Configurações
            </Link>
          </div>
        </nav>
      </aside>
      
      <main className="flex-1 overflow-auto bg-background/50">
        <div className="p-8 h-full">
          <AdminPageTransition>
            {children}
          </AdminPageTransition>
        </div>
      </main>
    </div>
  );
}
