import { Money } from '../value-objects/money.vo';

// Tipos suportados de transações de apostas
export enum WagerTransactionKind {
  Opening = 'OPENING',
  Bet = 'BET',
  Win = 'WIN',
  Loss = 'LOSS',
  Refund = 'REFUND',
  Rollback = 'ROLLBACK',
}

// Estados possíveis no ciclo de vida de uma transação
export enum WagerTransactionStatus {
  Pending = 'PENDING',
  PendingReference = 'PENDING_REFERENCE',
  Processed = 'PROCESSED',
  Rejected = 'REJECTED',
  Failed = 'FAILED',
}

export interface CreateWagerTransactionProps {
  id: string;
  providerId: string;
  externalTransactionId: string;
  idempotencyKey: string;
  payloadHash: string;
  walletId: string;
  playerId: string;
  roundId: string;
  gameId: string;
  kind: WagerTransactionKind;
  money: Money;
  referenceExternalTransactionId?: string;
}

export interface WagerTransactionState extends CreateWagerTransactionProps {
  status: WagerTransactionStatus;
  createdAt: Date;
  referenceTransactionId?: string;
  failureCode?: string;
  processedAt?: Date;
}

/**
 * Entidade de domínio responsável por gerenciar o ciclo de vida, as invariantes
 * e as regras de negócio de uma transação de aposta.
 */
export class WagerTransaction {
  private constructor(
    public readonly id: string,
    public readonly providerId: string,
    public readonly externalTransactionId: string,
    public readonly idempotencyKey: string,
    public readonly payloadHash: string,
    public readonly walletId: string,
    public readonly playerId: string,
    public readonly roundId: string,
    public readonly gameId: string,
    public readonly kind: WagerTransactionKind,
    public readonly money: Money,
    public readonly referenceExternalTransactionId: string | undefined,
    public readonly createdAt: Date,
    private _status: WagerTransactionStatus,
    private _referenceTransactionId?: string,
    private _failureCode?: string,
    private _processedAt?: Date,
  ) {}

  /**
   * Fábrica para criar uma nova transação aplicando as regras e invariantes de domínio.
   */
  public static create(props: CreateWagerTransactionProps): WagerTransaction {
    // Transações do tipo OPENING não podem ser submetidas externamente via API
    if (props.kind === WagerTransactionKind.Opening) {
      throw new Error('OPENING_TRANSACTION_CANNOT_BE_SUBMITTED_EXTERNALLY');
    }

    // REFUND e ROLLBACK exigem obrigatoriamente uma transação de referência
    if (
      (props.kind === WagerTransactionKind.Refund || props.kind === WagerTransactionKind.Rollback) &&
      !props.referenceExternalTransactionId
    ) {
      throw new Error('REFERENCE_TRANSACTION_ID_REQUIRED');
    }

    return new WagerTransaction(
      props.id,
      props.providerId,
      props.externalTransactionId,
      props.idempotencyKey,
      props.payloadHash,
      props.walletId,
      props.playerId,
      props.roundId,
      props.gameId,
      props.kind,
      props.money,
      props.referenceExternalTransactionId,
      new Date(),
      WagerTransactionStatus.Pending,
    );
  }

  /**
   * Rehidrata a entidade a partir do estado persistido no banco de dados.
   */
  public static rehydrate(state: WagerTransactionState): WagerTransaction {
    return new WagerTransaction(
      state.id,
      state.providerId,
      state.externalTransactionId,
      state.idempotencyKey,
      state.payloadHash,
      state.walletId,
      state.playerId,
      state.roundId,
      state.gameId,
      state.kind,
      state.money,
      state.referenceExternalTransactionId,
      state.createdAt,
      state.status,
      state.referenceTransactionId,
      state.failureCode,
      state.processedAt,
    );
  }

  get status(): WagerTransactionStatus {
    return this._status;
  }

  get referenceTransactionId(): string | undefined {
    return this._referenceTransactionId;
  }

  get failureCode(): string | undefined {
    return this._failureCode;
  }

  get processedAt(): Date | undefined {
    return this._processedAt;
  }

  /**
   * Marca a transação como processada com sucesso.
   */
  public markProcessed(referenceTransactionId?: string, at = new Date()): void {
    this.assertNotTerminal();
    this._status = WagerTransactionStatus.Processed;
    this._referenceTransactionId = referenceTransactionId;
    this._processedAt = at;
  }

  /**
   * Coloca a transação em estado de espera por sua transação de referência.
   */
  public markPendingReference(): void {
    this.assertNotTerminal();
    this._status = WagerTransactionStatus.PendingReference;
  }

  /**
   * Rejeita a transação registrando o código de erro/falha correspondente.
   */
  public reject(code: string): void {
    this.assertNotTerminal();
    this._status = WagerTransactionStatus.Rejected;
    this._failureCode = code;
  }

  /**
   * Marca a transação como falha.
   */
  public fail(code: string): void {
    this.assertNotTerminal();
    this._status = WagerTransactionStatus.Failed;
    this._failureCode = code;
  }

  /**
   * Verifica se a transação já atingiu um estado final.
   */
  public isTerminal(): boolean {
    return (
      this._status === WagerTransactionStatus.Processed ||
      this._status === WagerTransactionStatus.Rejected ||
      this._status === WagerTransactionStatus.Failed
    );
  }

  /**
   * Indica se a transação altera o saldo da carteira (Losses não alteram diretamente).
   */
  public affectsBalance(): boolean {
    return this.kind !== WagerTransactionKind.Loss;
  }

  /**
   * Indica se o tipo de transação requer uma transação de referência prévia.
   */
  public requiresReference(): boolean {
    return this.kind === WagerTransactionKind.Refund || this.kind === WagerTransactionKind.Rollback;
  }

  /**
   * Valida se o hash do payload enviado coincide com o registrado (prevenção de conflito de idempotência).
   */
  public matchesPayload(payloadHash: string): boolean {
    return this.payloadHash === payloadHash;
  }

  /**
   * Garante que transações em estados terminais não sofram novas alterações de estado.
   */
  private assertNotTerminal(): void {
    if (this.isTerminal()) {
      throw new Error(`Cannot transition terminal transaction in status ${this._status}`);
    }
  }
}