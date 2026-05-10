/*
  # 調剤ワークフロー対応: audit_logsに患者名・完了時刻カラム追加

  ## 変更内容
  - `audit_logs.patient_name` 追加: 薬局内での患者氏名表示用（薬局自身のみ参照可）
  - `audit_logs.dispensed_at` 追加: 調剤完了ボタンを押した時刻
  - `audit_logs.audit_completed_at` 追加: 監査完了ボタンを押した時刻
  - `audit_logs.workflow_status` 追加: 'dispensing' | 'auditing' | 'complete'

  ## セキュリティ
  - 既存のRLSポリシーをそのまま継承（pharmacy_id = auth.uid()）
  - patient_nameはDBには保存されるが、他薬局は参照不可
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'patient_name'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN patient_name text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'dispensed_at'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN dispensed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'audit_completed_at'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN audit_completed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'workflow_status'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN workflow_status text NOT NULL DEFAULT 'complete'
      CHECK (workflow_status IN ('dispensing', 'auditing', 'complete'));
  END IF;
END $$;
