export const formatCLP = (amount: number): string =>
  '$' + Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
