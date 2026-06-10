import {
  View, Text, ScrollView, TouchableOpacity, Modal, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Calendar } from 'react-native-calendars';
import { useTripTasks, useCreateTask, useCompleteTask, useDeleteTask } from '../../../hooks/useTask';
import { useAppStore } from '../../../store/useAppStore';
import { useTheme } from '../../../hooks/useTheme';
import type { TaskCategory, TripTask } from '../../../types';

const CATEGORIES: { value: TaskCategory; label: string; icon: string; color: string }[] = [
  { value: 'flights', label: 'Flights', icon: 'airplane-outline', color: '#3B82F6' },
  { value: 'hotel', label: 'Hotel', icon: 'bed-outline', color: '#8B5CF6' },
  { value: 'activities', label: 'Activities', icon: 'bicycle-outline', color: '#10B981' },
  { value: 'transport', label: 'Transport', icon: 'car-outline', color: '#F59E0B' },
  { value: 'packing', label: 'Packing', icon: 'bag-outline', color: '#EF4444' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline', color: '#64748B' },
];

function catMeta(cat: TaskCategory) {
  return CATEGORIES.find((c) => c.value === cat) ?? CATEGORIES[5];
}

export default function SoloTasksScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user } = useAppStore();
  const { data: tasks, isLoading } = useTripTasks(tripId);
  const createTask = useCreateTask();
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();
  const { isDark } = useTheme();

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('other');
  const [dueDate, setDueDate] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; submit?: string }>({});
  const [alertInfo, setAlertInfo] = useState<{ title: string; message: string } | null>(null);

  const todo = tasks?.filter((t) => !t.completed_at) ?? [];
  const done = tasks?.filter((t) => !!t.completed_at) ?? [];

  function resetForm() {
    setTitle('');
    setCategory('other');
    setDueDate('');
    setShowCalendar(false);
    setErrors({});
  }

  async function handleCreate() {
    const trimmed = title.trim();
    if (!trimmed) {
      setErrors({ title: 'Task title is required.' });
      return;
    }
    setErrors({});
    try {
      await createTask.mutateAsync({
        trip_id: tripId,
        title: trimmed,
        category,
        assigned_to: user!.id,
        due_date: dueDate || null,
      });
      setShowCreate(false);
      resetForm();
    } catch (e: any) {
      setErrors({ submit: e.message });
    }
  }

  async function handleToggle(task: TripTask) {
    try {
      await completeTask.mutateAsync({ task_id: task.id, trip_id: tripId, completed: !task.completed_at });
    } catch (e: any) {
      setAlertInfo({ title: 'Error', message: e.message });
    }
  }

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleDelete(task: TripTask) {
    setConfirmDeleteId(task.id);
  }

  async function confirmDelete() {
    const task = tasks?.find((t) => t.id === confirmDeleteId);
    if (!task) return;
    setConfirmDeleteId(null);
    try {
      await deleteTask.mutateAsync({ task_id: task.id, trip_id: tripId });
    } catch (e: any) {
      setAlertInfo({ title: 'Error', message: e.message });
    }
  }

  function TaskRow({ task }: { task: TripTask }) {
    const meta = catMeta(task.category);
    const isComplete = !!task.completed_at;
    const canDelete = task.created_by === user?.id;

    return (
      <View
        className={`mb-3 flex-row items-center gap-3 rounded-2xl border px-4 py-4 transition-all duration-200 ${
          isComplete
            ? 'border-slate-50 bg-slate-55/40 dark:border-slate-900/50 dark:bg-slate-900/20'
            : 'border-slate-100 bg-white shadow-sm dark:border-slate-800/80 dark:bg-slate-900'
        }`}
      >
        <TouchableOpacity
          onPress={() => handleToggle(task)}
          disabled={completeTask.isPending}
          className="transition-all duration-200 active:scale-95"
        >
          <Ionicons
            name={isComplete ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={isComplete ? '#10B981' : '#94A3B8'}
          />
        </TouchableOpacity>

        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${meta.color}15`, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={meta.icon as any} size={16} color={meta.color} />
        </View>

        <View className="flex-1">
          <Text className={`font-semibold text-sm ${isComplete ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>{task.title}</Text>
          {task.due_date && (
            <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-550 mt-1">Due {format(new Date(task.due_date + 'T12:00:00'), 'MMM d')}</Text>
          )}
        </View>

        {canDelete && (
          <TouchableOpacity onPress={() => handleDelete(task)} className="p-1 transition-all duration-200 active:scale-95">
            <Ionicons name="close-circle-outline" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50/60 dark:bg-slate-950/60" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Tasks' }} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={isDark ? '#ffffff' : '#0f172a'} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
          {tasks?.length === 0 && (
            <View className="items-center py-20">
              <Ionicons name="checkbox-outline" size={48} color="#94A3B8" />
              <Text className="mt-4 text-base font-bold text-slate-900 dark:text-white">No Tasks Yet</Text>
              <Text className="mt-2 text-sm text-slate-500 text-center max-w-xs leading-relaxed">Add tasks to stay on top of your trip planning.</Text>
            </View>
          )}

          {(tasks?.length ?? 0) > 0 && (
            <View className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-550">Progress</Text>
                <Text className="text-sm font-extrabold text-slate-900 dark:text-white">{done.length}/{tasks?.length} done</Text>
              </View>
              <View className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-850">
                <View
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${tasks?.length ? (done.length / tasks.length) * 100 : 0}%` }}
                />
              </View>
            </View>
          )}

          {todo.length > 0 && (
            <View className="mb-4">
              <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-550">To Do · {todo.length}</Text>
              {todo.map((t) => <TaskRow key={t.id} task={t} />)}
            </View>
          )}

          {done.length > 0 && (
            <View className="mb-4 mt-2">
              <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-550">Done · {done.length}</Text>
              {done.map((t) => <TaskRow key={t.id} task={t} />)}
            </View>
          )}
        </ScrollView>
      )}

      <View className="absolute bottom-6 right-5">
        <TouchableOpacity
          onPress={() => setShowCreate(true)}
          className="flex-row items-center gap-2 rounded-2xl bg-slate-900 px-5 py-4 shadow-lg transition-all duration-200 active:scale-95 dark:bg-white"
        >
          <Ionicons name="add" size={20} color={isDark ? '#0f172a' : '#ffffff'} />
          <Text className="font-bold text-white dark:text-slate-900 uppercase tracking-wider text-xs">Add Task</Text>
        </TouchableOpacity>
      </View>

      {/* Delete confirmation modal */}
      <Modal visible={!!confirmDeleteId} animationType="fade" transparent>
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80">
            <Text className="mb-2 text-lg font-bold text-slate-900 dark:text-white">Delete Task?</Text>
            <Text className="mb-6 text-sm text-slate-500 dark:text-slate-400">This task will be permanently removed.</Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setConfirmDeleteId(null)}
                className="flex-1 items-center rounded-xl border border-slate-100 bg-white py-3 transition-all duration-200 active:scale-95 dark:border-slate-800/80 dark:bg-slate-900"
              >
                <Text className="font-semibold text-slate-500 dark:text-slate-400">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmDelete}
                disabled={deleteTask.isPending}
                className="flex-1 items-center rounded-xl bg-red-500 py-3 transition-all duration-200 active:scale-95"
              >
                {deleteTask.isPending ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="font-bold text-white">Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <View className="flex-1 justify-end bg-black/50">
            <View className="rounded-t-3xl bg-white px-6 pb-12 pt-6 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80" style={{ maxHeight: '90%' }}>
              <View className="mb-6 flex-row items-center justify-between">
                <Text className="text-lg font-bold text-slate-900 dark:text-white">New Task</Text>
                <TouchableOpacity onPress={() => { setShowCreate(false); resetForm(); }}>
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                <Text className="mb-2 text-slate-400 text-xs font-semibold tracking-wider uppercase">Title</Text>
                <TextInput
                  value={title}
                  onChangeText={(v) => { setTitle(v); if (errors.title) setErrors((e) => ({ ...e, title: undefined })); }}
                  placeholder="Task title"
                  placeholderTextColor="#94A3B8"
                  className={`rounded-xl border bg-white px-4 py-4 text-base text-slate-900 dark:bg-slate-900 dark:text-white ${errors.title ? 'mb-1 border-red-500' : 'mb-4 border-slate-100 dark:border-slate-800/80'}`}
                />
                {!!errors.title && <Text className="mb-3 text-xs font-medium text-red-500">{errors.title}</Text>}

                <Text className="mb-2 text-slate-400 text-xs font-semibold tracking-wider uppercase">Category</Text>
                <View className="mb-5 flex-row flex-wrap gap-2">
                  {CATEGORIES.map((c) => {
                    const isSelected = category === c.value;
                    return (
                      <TouchableOpacity
                        key={c.value}
                        onPress={() => setCategory(c.value)}
                        className={`flex-row items-center gap-1.5 rounded-full px-4 py-2 transition-all duration-200 active:scale-95 ${isSelected ? 'bg-slate-900 dark:bg-white' : 'bg-slate-100 dark:bg-slate-850'}`}
                      >
                        <Ionicons name={c.icon as any} size={14} color={isSelected ? (isDark ? '#0f172a' : 'white') : '#64748B'} />
                        <Text className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'}`}>{c.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text className="mb-2 text-slate-450 text-xs font-semibold tracking-wider uppercase">Due date (optional)</Text>
                <TouchableOpacity
                  onPress={() => setShowCalendar(!showCalendar)}
                  className="mb-3 flex-row items-center gap-2 rounded-xl border border-slate-100 bg-white px-4 py-4 dark:border-slate-800/80 dark:bg-slate-900"
                >
                  <Ionicons name="calendar-outline" size={18} color="#2563EB" />
                  <Text className={dueDate ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-400'}>
                    {dueDate ? format(new Date(dueDate + 'T12:00:00'), 'MMM d, yyyy') : 'No due date'}
                  </Text>
                  {dueDate && (
                    <TouchableOpacity onPress={() => setDueDate('')} className="ml-auto">
                      <Ionicons name="close-circle" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                {showCalendar && (
                  <View className="mb-5 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800/80">
                    <Calendar
                      theme={{
                        calendarBackground: isDark ? '#0f172a' : '#ffffff',
                        textSectionTitleColor: isDark ? '#94a3b8' : '#475569',
                        selectedDayBackgroundColor: isDark ? '#ffffff' : '#0f172a',
                        selectedDayTextColor: isDark ? '#0f172a' : '#ffffff',
                        todayTextColor: '#2563eb',
                        dayTextColor: isDark ? '#ffffff' : '#0f172a',
                        textDisabledColor: isDark ? '#334155' : '#cbd5e1',
                        dotColor: '#2563eb',
                        arrowColor: '#2563eb',
                        monthTextColor: isDark ? '#ffffff' : '#0f172a',
                        textDayFontWeight: '500',
                        textMonthFontWeight: 'bold',
                        textDayHeaderFontWeight: '600',
                      }}
                      onDayPress={(day: { dateString: string }) => { setDueDate(day.dateString); setShowCalendar(false); }}
                      markedDates={dueDate ? { [dueDate]: { selected: true, selectedColor: isDark ? '#ffffff' : '#0f172a', selectedTextColor: isDark ? '#0f172a' : '#ffffff' } } : {}}
                      minDate={new Date().toISOString().split('T')[0]}
                    />
                  </View>
                )}

              </ScrollView>

              {!!errors.submit && <Text className="mb-3 text-center text-xs font-medium text-red-500">{errors.submit}</Text>}
              <TouchableOpacity
                onPress={handleCreate}
                disabled={createTask.isPending}
                className="mt-2 rounded-xl bg-slate-900 py-4 items-center transition-all duration-200 active:scale-95 dark:bg-white"
              >
                {createTask.isPending ? (
                  <ActivityIndicator color={isDark ? '#0f172a' : 'white'} />
                ) : (
                  <Text className="font-bold text-white dark:text-slate-900 uppercase tracking-wider text-xs">Add Task</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Custom Alert Modal */}
      <Modal visible={!!alertInfo} animationType="fade" transparent>
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80">
            <Text className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{alertInfo?.title}</Text>
            <Text className="mb-6 text-sm text-slate-500 dark:text-slate-400">{alertInfo?.message}</Text>
            <TouchableOpacity
              onPress={() => setAlertInfo(null)}
              className="w-full items-center rounded-xl bg-slate-900 py-3 transition-all duration-200 active:scale-95 dark:bg-white"
            >
              <Text className="font-bold text-white dark:text-slate-900">Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
