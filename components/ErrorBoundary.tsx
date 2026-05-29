"use client";

import { Component, type ReactNode } from "react";

// Contém erros de render de componentes-cliente (ex.: um gráfico Recharts que
// recebe dado inesperado) para que a falha de um painel não derrube os painéis
// vizinhos. Só captura erros do CLIENTE — erros de Server Component sobem normal.

interface Props {
  children: ReactNode;
  titulo?: string;
}

interface State {
  erro: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: false };

  static getDerivedStateFromError(): State {
    return { erro: true };
  }

  componentDidCatch(error: unknown) {
    console.error("ErrorBoundary capturou:", error);
  }

  render() {
    if (this.state.erro) {
      return (
        <div className="bg-azul-medio rounded-lg p-5 border border-vermelho/30">
          <p className="text-gray-400 text-sm">
            {this.props.titulo ?? "Este painel"} não pôde ser exibido no momento.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
