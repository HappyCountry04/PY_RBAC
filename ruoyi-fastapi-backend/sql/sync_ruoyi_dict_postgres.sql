begin;

delete from sys_dict_data;
delete from sys_dict_type;

insert into sys_dict_type(dict_id, dict_name, dict_type, status, create_by, create_time, remark)
values
  (1,  '用户性别', 'sys_user_sex',       '0', 'admin', now(), '用户性别列表'),
  (2,  '菜单状态', 'sys_show_hide',      '0', 'admin', now(), '菜单状态列表'),
  (3,  '系统开关', 'sys_normal_disable', '0', 'admin', now(), '系统开关列表'),
  (4,  '任务状态', 'sys_job_status',     '0', 'admin', now(), '任务状态列表'),
  (5,  '任务分组', 'sys_job_group',      '0', 'admin', now(), '任务分组列表'),
  (6,  '系统是否', 'sys_yes_no',         '0', 'admin', now(), '系统是否列表'),
  (7,  '通知类型', 'sys_notice_type',    '0', 'admin', now(), '通知类型列表'),
  (8,  '通知状态', 'sys_notice_status',  '0', 'admin', now(), '通知状态列表'),
  (9,  '操作类型', 'sys_oper_type',      '0', 'admin', now(), '操作类型列表'),
  (10, '系统状态', 'sys_common_status',  '0', 'admin', now(), '登录状态列表');

insert into sys_dict_data(dict_code, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, create_by, create_time, remark)
values
  (1,  1,  '男',       '0',       'sys_user_sex',       '', '',        'Y', '0', 'admin', now(), '性别男'),
  (2,  2,  '女',       '1',       'sys_user_sex',       '', '',        'N', '0', 'admin', now(), '性别女'),
  (3,  3,  '未知',     '2',       'sys_user_sex',       '', '',        'N', '0', 'admin', now(), '性别未知'),
  (4,  1,  '显示',     '0',       'sys_show_hide',      '', 'primary', 'Y', '0', 'admin', now(), '显示菜单'),
  (5,  2,  '隐藏',     '1',       'sys_show_hide',      '', 'danger',  'N', '0', 'admin', now(), '隐藏菜单'),
  (6,  1,  '正常',     '0',       'sys_normal_disable', '', 'primary', 'Y', '0', 'admin', now(), '正常状态'),
  (7,  2,  '停用',     '1',       'sys_normal_disable', '', 'danger',  'N', '0', 'admin', now(), '停用状态'),
  (8,  1,  '正常',     '0',       'sys_job_status',     '', 'primary', 'Y', '0', 'admin', now(), '正常状态'),
  (9,  2,  '暂停',     '1',       'sys_job_status',     '', 'danger',  'N', '0', 'admin', now(), '停用状态'),
  (10, 1,  '默认',     'DEFAULT', 'sys_job_group',      '', '',        'Y', '0', 'admin', now(), '默认分组'),
  (11, 2,  '系统',     'SYSTEM',  'sys_job_group',      '', '',        'N', '0', 'admin', now(), '系统分组'),
  (12, 1,  '是',       'Y',       'sys_yes_no',         '', 'primary', 'Y', '0', 'admin', now(), '系统默认是'),
  (13, 2,  '否',       'N',       'sys_yes_no',         '', 'danger',  'N', '0', 'admin', now(), '系统默认否'),
  (14, 1,  '通知',     '1',       'sys_notice_type',    '', 'warning', 'Y', '0', 'admin', now(), '通知'),
  (15, 2,  '公告',     '2',       'sys_notice_type',    '', 'success', 'N', '0', 'admin', now(), '公告'),
  (16, 1,  '正常',     '0',       'sys_notice_status',  '', 'primary', 'Y', '0', 'admin', now(), '正常状态'),
  (17, 2,  '关闭',     '1',       'sys_notice_status',  '', 'danger',  'N', '0', 'admin', now(), '关闭状态'),
  (18, 99, '其他',     '0',       'sys_oper_type',      '', 'info',    'N', '0', 'admin', now(), '其他操作'),
  (19, 1,  '新增',     '1',       'sys_oper_type',      '', 'info',    'N', '0', 'admin', now(), '新增操作'),
  (20, 2,  '修改',     '2',       'sys_oper_type',      '', 'info',    'N', '0', 'admin', now(), '修改操作'),
  (21, 3,  '删除',     '3',       'sys_oper_type',      '', 'danger',  'N', '0', 'admin', now(), '删除操作'),
  (22, 4,  '授权',     '4',       'sys_oper_type',      '', 'primary', 'N', '0', 'admin', now(), '授权操作'),
  (23, 5,  '导出',     '5',       'sys_oper_type',      '', 'warning', 'N', '0', 'admin', now(), '导出操作'),
  (24, 6,  '导入',     '6',       'sys_oper_type',      '', 'warning', 'N', '0', 'admin', now(), '导入操作'),
  (25, 7,  '强退',     '7',       'sys_oper_type',      '', 'danger',  'N', '0', 'admin', now(), '强退操作'),
  (26, 8,  '生成代码', '8',       'sys_oper_type',      '', 'warning', 'N', '0', 'admin', now(), '生成操作'),
  (27, 9,  '清空数据', '9',       'sys_oper_type',      '', 'danger',  'N', '0', 'admin', now(), '清空操作'),
  (28, 1,  '成功',     '0',       'sys_common_status',  '', 'primary', 'N', '0', 'admin', now(), '正常状态'),
  (29, 2,  '失败',     '1',       'sys_common_status',  '', 'danger',  'N', '0', 'admin', now(), '停用状态');

select setval(pg_get_serial_sequence('sys_dict_type', 'dict_id'), greatest((select max(dict_id) from sys_dict_type), 99), true);
select setval(pg_get_serial_sequence('sys_dict_data', 'dict_code'), greatest((select max(dict_code) from sys_dict_data), 99), true);

commit;
