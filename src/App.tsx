import { Button } from "@/components/ui/button";

function App() {
  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground">
      <header className="border-b px-4 py-2">
        <h1 className="text-lg font-semibold">AirPDF</h1>
      </header>
      <main className="flex-1 flex items-center justify-center">
        <Button>Abrir PDF</Button>
      </main>
    </div>
  );
}

export default App;
