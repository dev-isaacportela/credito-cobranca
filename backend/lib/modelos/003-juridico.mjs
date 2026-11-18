// Modelo da notificação extrajudicial (RN-024, RN-025, 01 §13): efeito legal, nasce não validado (P-06, P-11).
// O corpo são as 5 cláusulas do artefato (E §3.1); cabeçalho, tabela dos títulos e fecho são montados pela 003
// (`montarNotificacao`). [TOTAL] e [PRAZO_DIAS] chegam formatados ("R$ 31.087,25, assim composto: …", "15 (quinze)").

export const MODELOS = [{
  codigo: 'JUR_NOTIF_EXTRAJUDICIAL',
  nome: 'Jurídico · Notificação extrajudicial',
  assunto: 'Notificação extrajudicial de cobrança · [RAZAO_SOCIAL]',
  camposExtras: 'PRAZO_DIAS,TOTAL,BANCO,REPRESENTANTE,CARGO_REPRESENTANTE',
  efeitoLegal: true,
  corpo: `Prezado(a) Senhor(a),

Pela presente, a NOTIFICANTE vem, respeitosamente, comunicar a existência de débito vencido e não pago em seu nome, nos termos a seguir.

1. Do débito
Atualizado até [DATA_HOJE], o débito soma [TOTAL], conforme o demonstrativo anexo, referente às notas fiscais emitidas e às mercadorias entregues e recebidas.

2. Da constituição em mora e do prazo
Fica a NOTIFICADA constituída em mora, nos termos dos arts. 389, 394 e 397 do Código Civil, e intimada a quitar o débito no prazo improrrogável de [PRAZO_DIAS] dias corridos, contados do recebimento desta.

3. Da forma de pagamento e do contato
O pagamento pode ser feito pelo boleto anexo ou por PIX ou depósito em [BANCO]. O comprovante, ou uma proposta de pagamento, deve ser enviado a [EMAIL_CONTATO] ou pelo telefone [TELEFONE_CONTATO]. A apresentação de proposta não suspende o prazo.

4. Das medidas judiciais
Decorrido o prazo sem pagamento, a NOTIFICANTE ajuizará a ação cabível (execução, monitória ou cobrança), pleiteando o principal, a correção monetária, os juros, a multa pactuada, os honorários advocatícios e as custas, sem nova comunicação e sem prejuízo do protesto.

5. Da solução amigável
A NOTIFICANTE permanece aberta à solução amigável. Caso o pagamento já tenha sido feito, desconsidere esta notificação.

Sem mais, subscrevemo-nos.
[REPRESENTANTE] · [CARGO_REPRESENTANTE]`,
}];
