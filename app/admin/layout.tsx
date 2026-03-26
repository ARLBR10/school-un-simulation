import Link from "next/link";
import { AdminPageTransition } from "@/components/admin/AdminPageTransition";
import { 
  Users, 
  UserCog,
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
    <div className="flex w-full flex-1">
      <aside className="w-64 flex-shrink-0 border-r border-border/50 bg-muted/40 min-h-full">
        <nav className="flex h-full flex-col gap-2 p-4">
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
            href="/admin/members" 
            className="group flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent/80 hover:text-accent-foreground transition-all duration-200 text-sm"
          >
            <Users className="h-4 w-4 transition-transform group-hover:scale-110" />
            Membros
          </Link>

          <Link
            href="/admin/users"
            className="group flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent/80 hover:text-accent-foreground transition-all duration-200 text-sm"
          >
            <UserCog className="h-4 w-4 transition-transform group-hover:scale-110" />
            Usuários
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
          
        </nav>
      </aside>
      
      <main className="flex-1">
        <div className="p-8">
          <AdminPageTransition>
            {children}
          </AdminPageTransition>
        </div>
      </main>
    </div>
  );
}
