interface CostoBadgeProps {
  costo: number;
  // undefined while the balance is still loading.
  saldo?: number;
}

export function CostoBadge({ costo, saldo }: CostoBadgeProps) {
  if (saldo === undefined) {
    return <p className="text-sm">Cuesta {costo} créditos</p>;
  }
  if (saldo < costo) {
    return (
      <p className="text-sm text-destructive">
        Cuesta {costo} créditos — tienes {saldo}. No tienes créditos
        suficientes.
      </p>
    );
  }
  return (
    <p className="text-sm">
      Cuesta {costo} créditos — tienes {saldo}.
    </p>
  );
}
