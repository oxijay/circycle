"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type UserRole = "WORKER" | "OFFICE" | "EXECUTIVE" | "ADMIN";

type AppUserRow = {
  id: string;
  employee_code: string;
  display_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type AuditRow = {
  id: string;
  actor_name: string | null;
  actor_role: UserRole | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  success: boolean;
  status_code: number;
  created_at: string;
  actor?: {
    id: string;
    employee_code: string;
    display_name: string;
    role: UserRole;
  } | null;
};

const ROLE_OPTIONS: UserRole[] = ["WORKER", "OFFICE", "EXECUTIVE", "ADMIN"];

export default function SettingsPage() {
  const [users, setUsers] = useState<AppUserRow[]>([]);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("WORKER");

  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch("/api/users", { cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as { error?: string } | AppUserRow[];
      if (!response.ok) {
        throw new Error((body as { error?: string }).error || "ไม่สามารถโหลดผู้ใช้งานได้");
      }
      setUsers(Array.isArray(body) ? body : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "ไม่สามารถโหลดผู้ใช้งานได้");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadAudit = useCallback(async () => {
    try {
      setLoadingAudit(true);
      const response = await fetch("/api/audit-logs?take=80", { cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as { error?: string } | AuditRow[];
      if (!response.ok) {
        throw new Error((body as { error?: string }).error || "ไม่สามารถโหลด Audit Logs ได้");
      }
      setAuditRows(Array.isArray(body) ? body : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "ไม่สามารถโหลด Audit Logs ได้");
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
    void loadAudit();
  }, [loadAudit, loadUsers]);

  const activeCount = useMemo(() => users.filter((row) => row.is_active).length, [users]);

  const createUser = async () => {
    try {
      setError("");
      setSuccess("");
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_code: newCode,
          display_name: newName,
          role: newRole,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error || "ไม่สามารถสร้างผู้ใช้ได้");
      }
      setNewCode("");
      setNewName("");
      setNewRole("WORKER");
      setSuccess("สร้างผู้ใช้งานสำเร็จ");
      await Promise.all([loadUsers(), loadAudit()]);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "ไม่สามารถสร้างผู้ใช้ได้");
    }
  };

  const saveUser = async (row: AppUserRow) => {
    try {
      setSavingUserId(row.id);
      setError("");
      setSuccess("");
      const response = await fetch(`/api/users/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: row.display_name,
          role: row.role,
          is_active: row.is_active,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error || "ไม่สามารถบันทึกผู้ใช้ได้");
      }
      setSuccess(`บันทึกผู้ใช้งาน ${row.employee_code} แล้ว`);
      await loadAudit();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "ไม่สามารถบันทึกผู้ใช้ได้");
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">System Settings</h1>
          <p className="text-sm text-muted-foreground">จัดการผู้ใช้งานและตรวจสอบ Audit Logs</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void loadUsers()} disabled={loadingUsers}>
            รีเฟรชผู้ใช้
          </Button>
          <Button variant="outline" onClick={() => void loadAudit()} disabled={loadingAudit}>
            รีเฟรช Log
          </Button>
        </div>
      </div>

      {error ? <div className="error-message">{error}</div> : null}
      {success ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-lg">ผู้ใช้งานระบบ</CardTitle>
              <p className="text-sm text-muted-foreground">
                ทั้งหมด {users.length} คน | active {activeCount} คน
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-[140px_minmax(0,_1fr)_170px_auto]">
              <Input
                placeholder="รหัสพนักงาน"
                value={newCode}
                onChange={(event) => setNewCode(event.target.value)}
              />
              <Input
                placeholder="ชื่อแสดงผล"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
              />
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={newRole}
                onChange={(event) => setNewRole(event.target.value as UserRole)}
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <Button onClick={() => void createUser()}>เพิ่มผู้ใช้</Button>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>รหัส</TableHead>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-semibold">{row.employee_code}</TableCell>
                      <TableCell>
                        <Input
                          value={row.display_name}
                          onChange={(event) =>
                            setUsers((prev) =>
                              prev.map((x) =>
                                x.id === row.id ? { ...x, display_name: event.target.value } : x
                              )
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <select
                          className="h-9 min-w-[130px] rounded-md border bg-background px-3 text-sm"
                          value={row.role}
                          onChange={(event) =>
                            setUsers((prev) =>
                              prev.map((x) =>
                                x.id === row.id ? { ...x, role: event.target.value as UserRole } : x
                              )
                            )
                          }
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={row.is_active}
                            onChange={(event) =>
                              setUsers((prev) =>
                                prev.map((x) =>
                                  x.id === row.id ? { ...x, is_active: event.target.checked } : x
                                )
                              )
                            }
                          />
                          ใช้งาน
                        </label>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          onClick={() => void saveUser(row)}
                          disabled={savingUserId === row.id}
                        >
                          บันทึก
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        {loadingUsers ? "กำลังโหลด..." : "ยังไม่มีผู้ใช้งาน"}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-lg">Audit Logs</CardTitle>
              <p className="text-sm text-muted-foreground">{auditRows.length} รายการล่าสุด</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เวลา</TableHead>
                    <TableHead>ผู้ใช้</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>ผลลัพธ์</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditRows.map((row) => {
                    const actorName = row.actor?.display_name || row.actor_name || "-";
                    const actorRole = row.actor?.role || row.actor_role;

                    return (
                      <TableRow key={row.id}>
                        <TableCell>{new Date(row.created_at).toLocaleString("th-TH")}</TableCell>
                        <TableCell>
                          {actorName}
                          {actorRole ? ` (${actorRole})` : ""}
                        </TableCell>
                        <TableCell>{row.action}</TableCell>
                        <TableCell>
                          {row.resource_type}
                          {row.resource_id ? `/${row.resource_id}` : ""}
                        </TableCell>
                        <TableCell>{row.success ? `SUCCESS (${row.status_code})` : `FAILED (${row.status_code})`}</TableCell>
                      </TableRow>
                    );
                  })}
                  {auditRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        {loadingAudit ? "กำลังโหลด..." : "ยังไม่มีข้อมูล Audit Logs"}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
