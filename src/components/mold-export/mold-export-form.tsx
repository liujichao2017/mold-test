'use client'

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { type MoldExportPriceFormValues, type MoldExportPriceSettingData, moldExportPriceFormSchema        } from "@/lib/validations/mold-export-price"


interface MoldPriceDifferFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: MoldExportPriceSettingData | null
  onSubmit: (values: FormData) => Promise<{ success: boolean; error?: string }>
}

export function MoldExportForm({
  open,
  onOpenChange,
  initialData,
  onSubmit,
}: MoldPriceDifferFormProps) {
  const form = useForm<MoldExportPriceFormValues>({
    resolver: zodResolver(moldExportPriceFormSchema),
    defaultValues: {
      maxWeight: 0,
      coefficient: 0,
    },
  })

  useEffect(() => {
    if (initialData) {
      form.reset({
        id: initialData.id,
        maxWeight: initialData.maxWeight,
        coefficient: Number(initialData.coefficient),
      })
    } else {
      form.reset({
        maxWeight: 0,
        coefficient: 0,
      })
    }
  }, [form, initialData])

  const handleSubmit = async (values: MoldExportPriceFormValues) => {
    const formData = new FormData()
    if (initialData?.id) {
      formData.append('id', String(initialData.id))
    }
    formData.append('maxWeight', String(values.maxWeight))
    formData.append('coefficient', String(values.coefficient))

    const result = await onSubmit(formData)
    
    if (result.success) {
      toast.success(initialData ? '更新成功' : '保存成功')
      onOpenChange(false)
      form.reset()
    } else {
      toast.error(result.error ?? '操作失败')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[425px]"
        aria-describedby="material-price-form-description"
      >
        <DialogHeader>
          <DialogTitle>
            {initialData ? '编辑模具出口价格系数' : '新增模具出口价格系数'}
          </DialogTitle>
          <DialogDescription id="mold-export-price-form-description">
            {initialData ? '编辑模具出口价格系数信息，所有字段都为必填。' : '添加新的模具出口价格系数信息，所有字段都为必填。'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="maxWeight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>最大重量(kg)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="number" 
                      step="1"
                      min="1"
                      onChange={(e) => {
                        const value = e.target.value === '' ? '' : Number(e.target.value);
                        field.onChange(value);
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      // onChange={(e) => field.onChange(Number(e.target.value))}
                      // value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="coefficient"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>价格系数</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      type="number" 
                      step="0.1"
                      min="1"
                      onChange={(e) => {
                        const value = e.target.value === '' ? '' : Number(e.target.value);
                        field.onChange(value);
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      // onChange={(e) => field.onChange(Number(e.target.value))}
                      // value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
              >
                重置
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                保存
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}